import { supabase } from './src/services/database/connection.js';

async function fixUserSync() {
  console.log('🔄 Starting user synchronization fix...');
  
  try {
    const { data: appUsers, error: appError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, created_at, password_hash')
      .order('created_at', { ascending: true });
    
    if (appError) {
      console.error('Error fetching app users:', appError);
      return;
    }
    
    console.log('📊 Current database state:');
    console.log(`  Total users in application table: ${appUsers?.length || 0}`);
    
    if (appUsers && appUsers.length > 0) {
      console.log('\n👥 Application users analysis:');
      appUsers.forEach((user, index) => {
        const passwordInfo = user.password_hash === 'admin_created' ? ' [ADMIN_CREATED]' : 
                            user.password_hash === '' ? ' [EMPTY_PASSWORD - ORPHANED]' : 
                            user.password_hash === 'supabase_managed' ? ' [SUPABASE_MANAGED]' :
                            user.password_hash ? ' [HAS_PASSWORD]' : ' [NO_PASSWORD - ORPHANED]';
        console.log(`  ${index + 1}. ${user.email} (${user.id})${passwordInfo} - Created: ${user.created_at}`);
      });
    }
    
    const orphanedUsers = appUsers?.filter(u => 
      !u.password_hash || 
      u.password_hash === '' || 
      u.password_hash === 'admin_created'
    ) || [];
    
    const validUsers = appUsers?.filter(u => 
      u.password_hash && 
      u.password_hash !== '' && 
      u.password_hash !== 'admin_created'
    ) || [];
    
    console.log(`\n🔍 Analysis results:`);
    console.log(`  - Valid users (exist in auth): ${validUsers.length}`);
    console.log(`  - Orphaned users (missing from auth): ${orphanedUsers.length}`);
    
    if (orphanedUsers.length > 0) {
      console.log('\n⚠️  Orphaned users found (these exist in database but not in auth.users):');
      orphanedUsers.forEach(user => {
        console.log(`  - ${user.email} (${user.id}) - Created: ${user.created_at}`);
      });
      
      console.log('\n🔧 Removing orphaned users from database...');
      for (const user of orphanedUsers) {
        console.log(`Removing orphaned user: ${user.email} (${user.id})`);
        
        const { error: roleError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', user.id);
        
        if (roleError) {
          console.error(`Failed to remove roles for user ${user.id}:`, roleError);
        }
        
        const { error: userError } = await supabase
          .from('users')
          .delete()
          .eq('id', user.id);
        
        if (userError) {
          console.error(`Failed to remove user ${user.id}:`, userError);
        } else {
          console.log(`✅ Removed orphaned user: ${user.email}`);
        }
      }
    }
    
    const { data: finalUsers } = await supabase
      .from('users')
      .select('id, email')
      .order('created_at', { ascending: true });
    
    console.log(`\n📊 Final state:`);
    console.log(`  - Users remaining in database: ${finalUsers?.length || 0}`);
    
    if (finalUsers && finalUsers.length > 0) {
      console.log('\n👥 Remaining users:');
      finalUsers.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.email} (${user.id})`);
      });
    }
    
    console.log('\n✅ User synchronization fix completed');
    console.log('💡 The database should now have the same number of users as auth.users table');
    
  } catch (error) {
    console.error('❌ Synchronization fix failed:', error);
  }
}

fixUserSync().catch(console.error);
