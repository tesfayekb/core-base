import { supabase } from '@/services/database';

export async function assignSuperAdminRole(userId: string): Promise<boolean> {
  try {
    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'SuperAdmin')
      .single();

    if (roleError || !roleData) {
      console.error('SuperAdmin role not found:', roleError);
      return false;
    }

    const { data: existingRole, error: checkError } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('role_id', roleData.id)
      .single();

    if (existingRole) {
      console.log('User already has SuperAdmin role');
      return true;
    }

    const { error: assignError } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role_id: roleData.id,
        tenant_id: null // SuperAdmin has system-wide access
      });

    if (assignError) {
      console.error('Error assigning SuperAdmin role:', assignError);
      return false;
    }

    console.log('Successfully assigned SuperAdmin role to user:', userId);
    return true;
  } catch (error) {
    console.error('Unexpected error in assignSuperAdminRole:', error);
    return false;
  }
}

export async function checkUserRoles(userId: string): Promise<string[]> {
  try {
    const { data: roleData, error } = await supabase
      .from('user_roles')
      .select(`
        roles!user_roles_role_id_fkey(
          name
        )
      `)
      .eq('user_id', userId);

    if (error || !roleData) {
      console.error('Error fetching user roles:', error);
      return [];
    }

    return roleData.map((ur: any) => ur.roles?.name).filter(Boolean);
  } catch (error) {
    console.error('Unexpected error in checkUserRoles:', error);
    return [];
  }
}
