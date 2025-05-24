
-- Enhanced Migration Support Functions for Supabase
-- Version: 2.0.0
-- Phase 1.2: Database Foundation - Enhanced Security Migration Support

-- Restricted migration execution function with enhanced security
CREATE OR REPLACE FUNCTION execute_migration_sql(
    migration_version TEXT,
    sql_query TEXT,
    expected_checksum TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    current_user_role TEXT;
    migration_exists BOOLEAN;
BEGIN
    -- Enhanced security check: Only allow service_role or specific migration users
    SELECT current_setting('request.jwt.claims', true)::json->>'role' INTO current_user_role;
    
    IF current_user_role NOT IN ('service_role', 'authenticated') THEN
        RAISE EXCEPTION 'Unauthorized: Migration function access denied. Role: %', current_user_role;
    END IF;
    
    -- Validate migration version format
    IF migration_version !~ '^[0-9]{3}_[a-zA-Z0-9_]+$' THEN
        RAISE EXCEPTION 'Invalid migration version format: %', migration_version;
    END IF;
    
    -- Check if migration already exists
    SELECT EXISTS (
        SELECT 1 FROM migrations 
        WHERE version = migration_version
    ) INTO migration_exists;
    
    IF migration_exists THEN
        RAISE EXCEPTION 'Migration % already applied', migration_version;
    END IF;
    
    -- Validate SQL for dangerous operations (basic safety check)
    IF sql_query ~* '\b(DROP\s+DATABASE|TRUNCATE\s+migrations|DELETE\s+FROM\s+migrations)\b' THEN
        RAISE EXCEPTION 'Dangerous SQL operation detected in migration';
    END IF;
    
    -- Log the migration execution attempt
    RAISE NOTICE 'Executing migration %: %', migration_version, left(sql_query, 100);
    
    -- Execute the SQL within a savepoint for rollback capability
    BEGIN
        EXECUTE sql_query;
        
        -- Return success result with metadata
        result := json_build_object(
            'success', true,
            'migration_version', migration_version,
            'message', 'Migration executed successfully',
            'timestamp', now(),
            'checksum', expected_checksum
        );
        
        RETURN result;
    EXCEPTION
        WHEN OTHERS THEN
            -- Log the error details
            RAISE NOTICE 'Migration % failed: % - %', migration_version, SQLSTATE, SQLERRM;
            RAISE EXCEPTION 'Migration % failed: %', migration_version, SQLERRM;
    END;
END;
$$;

-- Restricted function to check migration status (read-only)
CREATE OR REPLACE FUNCTION get_migration_status()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    migration_count INTEGER;
    last_migration RECORD;
BEGIN
    -- Security check
    IF current_setting('request.jwt.claims', true)::json->>'role' != 'authenticated' THEN
        RAISE EXCEPTION 'Unauthorized: Migration status access denied';
    END IF;
    
    -- Get migration statistics
    SELECT COUNT(*) INTO migration_count FROM migrations;
    
    -- Get last applied migration
    SELECT * INTO last_migration 
    FROM migrations 
    ORDER BY applied_at DESC 
    LIMIT 1;
    
    result := json_build_object(
        'total_migrations', migration_count,
        'last_migration', row_to_json(last_migration),
        'status_checked_at', now()
    );
    
    RETURN result;
END;
$$;

-- Grant restricted permissions
REVOKE ALL ON FUNCTION execute_migration_sql(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_migration_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION execute_migration_sql(TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION get_migration_status() TO authenticated;

-- Function to check migration table exists (unchanged for compatibility)
CREATE OR REPLACE FUNCTION migration_table_exists()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'migrations'
    );
$$;

GRANT EXECUTE ON FUNCTION migration_table_exists() TO authenticated;
