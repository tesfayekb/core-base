
-- Function to check if user is SuperAdmin
CREATE OR REPLACE FUNCTION is_super_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_super_admin BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_user_id
    AND r.name = 'SuperAdmin'
    AND r.is_system_role = true
  ) INTO v_is_super_admin;
  
  RETURN v_is_super_admin;
END;
$$;
