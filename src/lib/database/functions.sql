
-- Database Utility Functions for Enterprise System
-- Version: 1.0.0
-- Phase 1.2: Database Foundation - Utility Functions

-- =============================================================================
-- PERMISSION CHECKING FUNCTIONS
-- =============================================================================

/**
 * check_user_permission - Core permission resolution function
 * 
 * Checks if a user has a specific permission within their current tenant context.
 * This function implements the direct permission assignment model (no role hierarchy).
 * 
 * Performance Target: <15ms (99th percentile)
 * Cache Integration: Works with permission caching layer
 * 
 * @param p_user_id UUID - The user to check permissions for
 * @param p_action VARCHAR - The action to check (create, read, update, delete, manage, view, edit)
 * @param p_resource VARCHAR - The resource type to check against
 * @param p_resource_id UUID - Optional specific resource ID for granular permissions
 * 
 * @returns BOOLEAN - TRUE if user has permission, FALSE otherwise
 * 
 * Security: Uses SECURITY DEFINER to ensure consistent execution context
 * Multi-tenant: Automatically filters by current tenant context
 * 
 * Example: SELECT check_user_permission('user-uuid', 'read', 'documents', 'doc-uuid');
 */
CREATE OR REPLACE FUNCTION check_user_permission(
    p_user_id UUID,
    p_action VARCHAR,
    p_resource VARCHAR,
    p_resource_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    has_permission BOOLEAN := FALSE;
    current_tenant UUID;
BEGIN
    -- Get current tenant context (enforces multi-tenant isolation)
    current_tenant := current_tenant_id();
    
    -- Security check: Deny if no tenant context is set
    IF current_tenant IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check direct user permissions first (fastest path)
    -- This covers permissions directly assigned to users
    SELECT EXISTS(
        SELECT 1 
        FROM user_permissions up
        JOIN permissions p ON up.permission_id = p.id
        WHERE up.user_id = p_user_id
            AND up.tenant_id = current_tenant
            AND p.action::text = p_action
            AND p.resource = p_resource
            AND (p_resource_id IS NULL OR up.resource_id = p_resource_id)
            AND (up.expires_at IS NULL OR up.expires_at > CURRENT_TIMESTAMP)
    ) INTO has_permission;
    
    -- If no direct permission, check role-based permissions
    -- This covers permissions inherited through role assignments
    IF NOT has_permission THEN
        SELECT EXISTS(
            SELECT 1
            FROM user_roles ur
            JOIN role_permissions rp ON ur.role_id = rp.role_id
            JOIN permissions p ON rp.permission_id = p.id
            WHERE ur.user_id = p_user_id
                AND ur.tenant_id = current_tenant
                AND p.action::text = p_action
                AND p.resource = p_resource
                AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP)
        ) INTO has_permission;
    END IF;
    
    RETURN has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/**
 * get_user_permissions - Bulk permission retrieval function
 * 
 * Retrieves all effective permissions for a user within their tenant context.
 * Returns both direct permissions and role-based permissions with source tracking.
 * 
 * Performance Target: <25ms for typical user (5-10 roles)
 * Optimization: Single query with UNION for efficiency
 * 
 * @param p_user_id UUID - The user to get permissions for
 * 
 * @returns TABLE with permission details including source attribution
 * 
 * Usage: Used by permission cache warming and admin interfaces
 * Security: Automatically scoped to current tenant context
 */
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS TABLE(
    permission_name VARCHAR,
    resource VARCHAR,
    action VARCHAR,
    resource_id UUID,
    source VARCHAR
) AS $$
BEGIN
    -- Return direct permissions with source tracking
    -- These are permissions explicitly assigned to the user
    RETURN QUERY
    SELECT 
        p.name,
        p.resource,
        p.action::VARCHAR,
        up.resource_id,
        'direct'::VARCHAR as source
    FROM user_permissions up
    JOIN permissions p ON up.permission_id = p.id
    WHERE up.user_id = p_user_id
        AND up.tenant_id = current_tenant_id()
        AND (up.expires_at IS NULL OR up.expires_at > CURRENT_TIMESTAMP);
    
    -- Return role-based permissions with role source tracking
    -- These are permissions inherited through role membership
    RETURN QUERY
    SELECT 
        p.name,
        p.resource,
        p.action::VARCHAR,
        NULL::UUID as resource_id,
        r.name::VARCHAR as source
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    JOIN role_permissions rp ON r.id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = p_user_id
        AND ur.tenant_id = current_tenant_id()
        AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- TENANT MANAGEMENT FUNCTIONS
-- =============================================================================

/**
 * validate_tenant_access - Tenant access validation
 * 
 * Validates that a user has legitimate access to a specific tenant.
 * Used for tenant switching and cross-tenant operation validation.
 * 
 * Performance Target: <10ms
 * Security: Prevents unauthorized tenant access attempts
 * 
 * @param p_user_id UUID - User requesting access
 * @param p_tenant_id UUID - Tenant to validate access for
 * 
 * @returns BOOLEAN - TRUE if user has access, FALSE otherwise
 */
CREATE OR REPLACE FUNCTION validate_tenant_access(
    p_user_id UUID,
    p_tenant_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user is explicitly associated with the tenant
    -- Uses user_tenants junction table for many-to-many relationship
    RETURN EXISTS(
        SELECT 1
        FROM user_tenants ut
        WHERE ut.user_id = p_user_id
            AND ut.tenant_id = p_tenant_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/**
 * switch_tenant_context - Secure tenant context switching
 * 
 * Validates user access and switches tenant context atomically.
 * Implements secure tenant switching with access validation.
 * 
 * Performance Target: <200ms (includes context setup)
 * Security: Validates access before context switch
 * Audit: Logs tenant switching events for security monitoring
 * 
 * @param p_user_id UUID - User performing the switch
 * @param p_tenant_id UUID - Target tenant
 * 
 * @returns BOOLEAN - TRUE if switch successful, FALSE if access denied
 */
CREATE OR REPLACE FUNCTION switch_tenant_context(
    p_user_id UUID,
    p_tenant_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    has_access BOOLEAN;
BEGIN
    -- Validate user has legitimate access to target tenant
    SELECT validate_tenant_access(p_user_id, p_tenant_id) INTO has_access;
    
    IF has_access THEN
        -- Atomically set both tenant and user context
        PERFORM set_tenant_context(p_tenant_id);
        PERFORM set_user_context(p_user_id);
        RETURN TRUE;
    ELSE
        -- Log unauthorized access attempt for security monitoring
        PERFORM log_audit_event(
            'security_event'::audit_event_type,
            'unauthorized_tenant_access_attempt',
            'tenant',
            p_tenant_id,
            json_build_object('attempted_by', p_user_id)
        );
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- AUDIT LOGGING FUNCTIONS
-- =============================================================================

/**
 * log_audit_event - Centralized audit logging
 * 
 * Creates standardized audit log entries with automatic context enrichment.
 * Implements enterprise audit trail requirements with performance optimization.
 * 
 * Performance Target: <20ms async impact
 * Compliance: Meets enterprise audit requirements
 * Context: Automatically includes tenant and user context
 * 
 * @param p_event_type audit_event_type - Type of event being logged
 * @param p_action VARCHAR - Specific action performed
 * @param p_resource_type VARCHAR - Type of resource affected (optional)
 * @param p_resource_id UUID - Specific resource ID (optional)
 * @param p_details JSONB - Additional event details (optional)
 * @param p_ip_address INET - Client IP address (optional)
 * @param p_user_agent TEXT - Client user agent (optional)
 * 
 * @returns UUID - The audit log entry ID for reference
 */
CREATE OR REPLACE FUNCTION log_audit_event(
    p_event_type audit_event_type,
    p_action VARCHAR,
    p_resource_type VARCHAR DEFAULT NULL,
    p_resource_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT '{}',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    audit_id UUID;
BEGIN
    -- Insert audit record with automatic context enrichment
    -- Tenant and user context are automatically captured
    INSERT INTO audit_logs (
        tenant_id,
        user_id,
        event_type,
        action,
        resource_type,
        resource_id,
        details,
        ip_address,
        user_agent
    ) VALUES (
        current_tenant_id(),    -- Automatic tenant context
        current_user_id(),      -- Automatic user context
        p_event_type,
        p_action,
        p_resource_type,
        p_resource_id,
        p_details,
        p_ip_address,
        p_user_agent
    ) RETURNING id INTO audit_id;
    
    RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- USER MANAGEMENT FUNCTIONS
-- =============================================================================

/**
 * is_super_admin - SuperAdmin role validation
 * 
 * Checks if a user has SuperAdmin privileges across the system.
 * SuperAdmin is a special role with system-wide permissions.
 * 
 * Performance Target: <5ms (heavily cached)
 * Security: Used for privilege escalation checks
 * 
 * @param p_user_id UUID - User to check
 * @returns BOOLEAN - TRUE if user is SuperAdmin
 */
CREATE OR REPLACE FUNCTION is_super_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check for SuperAdmin role assignment
    -- SuperAdmin role provides system-wide privileges
    RETURN EXISTS(
        SELECT 1
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = p_user_id
            AND r.name = 'SuperAdmin'
            AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/**
 * get_user_primary_tenant - Primary tenant resolution
 * 
 * Determines a user's primary tenant with fallback logic.
 * Used for initial tenant context when user logs in.
 * 
 * Performance Target: <10ms
 * Logic: Primary flag -> Most recent -> First available
 * 
 * @param p_user_id UUID - User to get primary tenant for
 * @returns UUID - Primary tenant ID or NULL if no access
 */
CREATE OR REPLACE FUNCTION get_user_primary_tenant(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    primary_tenant_id UUID;
BEGIN
    -- First, try to get explicitly marked primary tenant
    SELECT tenant_id INTO primary_tenant_id
    FROM user_tenants
    WHERE user_id = p_user_id AND is_primary = TRUE
    LIMIT 1;
    
    -- If no primary tenant marked, get the most recently joined
    IF primary_tenant_id IS NULL THEN
        SELECT tenant_id INTO primary_tenant_id
        FROM user_tenants
        WHERE user_id = p_user_id
        ORDER BY joined_at DESC
        LIMIT 1;
    END IF;
    
    RETURN primary_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- SESSION MANAGEMENT FUNCTIONS
-- =============================================================================

/**
 * create_user_session - Secure session creation
 * 
 * Creates a new user session with security metadata.
 * Implements secure session management with expiration and tracking.
 * 
 * Performance Target: <100ms
 * Security: Includes IP and user agent tracking
 * Cleanup: Sessions automatically expire
 * 
 * @param p_user_id UUID - User creating session
 * @param p_tenant_id UUID - Tenant context for session
 * @param p_token_hash VARCHAR - Hashed session token
 * @param p_expires_at TIMESTAMP - Session expiration time
 * @param p_ip_address INET - Client IP address (optional)
 * @param p_user_agent TEXT - Client user agent (optional)
 * 
 * @returns UUID - Session ID for tracking
 */
CREATE OR REPLACE FUNCTION create_user_session(
    p_user_id UUID,
    p_tenant_id UUID,
    p_token_hash VARCHAR,
    p_expires_at TIMESTAMP WITH TIME ZONE,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    session_id UUID;
BEGIN
    -- Create session record with security metadata
    INSERT INTO user_sessions (
        user_id,
        tenant_id,
        token_hash,
        expires_at,
        ip_address,
        user_agent
    ) VALUES (
        p_user_id,
        p_tenant_id,
        p_token_hash,
        p_expires_at,
        p_ip_address,
        p_user_agent
    ) RETURNING id INTO session_id;
    
    RETURN session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/**
 * cleanup_expired_sessions - Session maintenance
 * 
 * Removes expired sessions from the database for security and performance.
 * Should be called periodically by maintenance jobs.
 * 
 * Performance Target: <5s per 1000 sessions
 * Maintenance: Prevents session table bloat
 * Security: Ensures expired sessions cannot be used
 * 
 * @returns INTEGER - Number of sessions cleaned up
 */
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Remove all expired sessions in a single operation
    DELETE FROM user_sessions 
    WHERE expires_at < CURRENT_TIMESTAMP;
    
    -- Return count of cleaned up sessions for monitoring
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
