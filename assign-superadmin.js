import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function assignSuperAdminToBethany() {
  try {
    console.log('🔍 Looking up bethany@bethany.com user...');
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', 'bethany@bethany.com')
      .single();

    if (userError || !userData) {
      console.error('❌ User bethany@bethany.com not found:', userError);
      return false;
    }

    console.log('✅ Found user:', userData);

    console.log('🔍 Looking up SuperAdmin role...');
    
    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('id, name')
      .eq('name', 'SuperAdmin')
      .single();

    if (roleError || !roleData) {
      console.error('❌ SuperAdmin role not found:', roleError);
      return false;
    }

    console.log('✅ Found SuperAdmin role:', roleData);

    console.log('🔍 Checking existing role assignments...');
    
    const { data: existingRole, error: checkError } = await supabase
      .from('user_roles')
      .select('id, tenant_id')
      .eq('user_id', userData.id)
      .eq('role_id', roleData.id);

    if (checkError) {
      console.error('❌ Error checking existing roles:', checkError);
      return false;
    }

    if (existingRole && existingRole.length > 0) {
      console.log('✅ User already has SuperAdmin role:', existingRole);
      return true;
    }

    console.log('🔧 Assigning SuperAdmin role...');
    
    const { error: assignError } = await supabase
      .from('user_roles')
      .insert({
        user_id: userData.id,
        role_id: roleData.id,
        tenant_id: null
      });

    if (assignError) {
      console.error('❌ Error assigning SuperAdmin role:', assignError);
      return false;
    }

    console.log('✅ Successfully assigned SuperAdmin role to bethany@bethany.com');
    return true;
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

assignSuperAdminToBethany().then(success => {
  console.log(success ? '🎉 Role assignment completed successfully!' : '💥 Role assignment failed!');
  process.exit(success ? 0 : 1);
});
