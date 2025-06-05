import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fhzhlyskfjvcwcqjssmb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoemhseXNrZmp2Y3djcWpzc21iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwNjIzMTksImV4cCI6MjA2MzYzODMxOX0.S2-LU5bi34Pcrg-XNEHj_SBQzxQncIe4tnOfhuyedNk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createBethanyUser() {
  try {
    console.log('🔧 Creating bethany@bethany.com user record...');
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        id: crypto.randomUUID(),
        email: 'bethany@bethany.com',
        first_name: 'Bethany',
        last_name: 'Tesfaye',
        status: 'active'
      })
      .select()
      .single();

    if (userError) {
      console.error('❌ Error creating user:', userError);
      return false;
    }

    console.log('✅ Created user:', userData);

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
      return false;
    }

    console.log('🎯 Final role status for bethany@bethany.com:', finalCheck);
    return true;

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

createBethanyUser().then(success => {
  console.log(success ? '🎉 User creation and role assignment completed!' : '💥 User creation failed!');
  process.exit(success ? 0 : 1);
});
