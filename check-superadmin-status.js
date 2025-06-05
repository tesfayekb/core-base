import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fhzhlyskfjvcwcqjssmb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoemhseXNrZmp2Y3djcWpzc21iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwNjIzMTksImV4cCI6MjA2MzYzODMxOX0.S2-LU5bi34Pcrg-XNEHj_SBQzxQncIe4tnOfhuyedNk';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSuperAdminStatus() {
  try {
    console.log('🔍 Checking bethany@bethany.com SuperAdmin status...');
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', 'bethany@bethany.com')
      .single();

    if (userError || !userData) {
      console.error('❌ User not found:', userError);
      return;
    }

    console.log('✅ Found user:', userData);

    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('id, name')
      .eq('name', 'SuperAdmin')
      .single();

    if (roleError || !roleData) {
      console.error('❌ SuperAdmin role not found:', roleError);
      return;
    }

    console.log('✅ Found SuperAdmin role:', roleData);

    const { data: userRoles, error: userRoleError } = await supabase
      .from('user_roles')
      .select('id, tenant_id, created_at')
      .eq('user_id', userData.id)
      .eq('role_id', roleData.id);

    if (userRoleError) {
      console.error('❌ Error checking user roles:', userRoleError);
      return;
    }

    if (!userRoles || userRoles.length === 0) {
      console.log('❌ No SuperAdmin role assigned to bethany@bethany.com');
      
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
        return;
      }

      console.log('✅ Successfully assigned SuperAdmin role!');
    } else {
      console.log('✅ SuperAdmin role already assigned:', userRoles);
    }

    const { data: finalCheck, error: finalError } = await supabase
      .from('user_roles')
      .select(`
        id,
        tenant_id,
        created_at,
        roles!user_roles_role_id_fkey(name)
      `)
      .eq('user_id', userData.id);

    if (finalError) {
      console.error('❌ Error in final check:', finalError);
      return;
    }

    console.log('🎯 Final role status for bethany@bethany.com:', finalCheck);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkSuperAdminStatus().then(() => {
  console.log('🏁 SuperAdmin status check complete');
  process.exit(0);
});
