
-- Migration Support Functions for Supabase
-- Version: 1.0.0
-- Phase 1.2: Database Foundation - Migration Support

-- Function to execute raw SQL (for migration system)
-- Note: This is a security-sensitive function and should be restricted
CREATE OR REPLACE FUNCTION execute_sql(sql_query TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    rec RECORD;
    results JSON[] := '{}';
BEGIN
    -- Security check: Only allow authenticated users with specific role
    IF current_setting('request.jwt.claims', true)::json->>'role' != 'authenticated' THEN
        RAISE EXCEPTION 'Unauthorized: Migration function access denied';
    END IF;
    
    -- Log the migration execution
    RAISE NOTICE 'Executing migration SQL: %', left(sql_query, 100);
    
    -- Execute the SQL
    BEGIN
        EXECUTE sql_query;
        
        -- Return success result
        result := json_build_object(
            'success', true,
            'message', 'SQL executed successfully',
            'timestamp', now()
        );
        
        RETURN result;
    EXCEPTION
        WHEN OTHERS THEN
            -- Log the error and re-raise
            RAISE NOTICE 'Migration SQL error: % - %', SQLSTATE, SQLERRM;
            RAISE EXCEPTION 'Migration failed: %', SQLERRM;
    END;
END;
$$;

-- Grant execute permission to authenticated users only
REVOKE ALL ON FUNCTION execute_sql(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION execute_sql(TEXT) TO authenticated;

-- Function to check migration table exists
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION migration_table_exists() TO authenticated;
