import { supabase } from './src/services/database.js';

async function testUserSync() {
  console.log('🔍 Testing user synchronization between auth.users and database users tables...');
  
  try {
    const { data: testData, error: testError } = await supabase.from('users').select('count', { count: 'exact', head: true });
    if (testError) {
      console.error('❌ Connection test failed:', testError);
      return;
    }
    
    const { data: appUsers, error: appError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, created_at, password_hash')
      .order('created_at', { ascending: true });
    
    if (appError) {
      console.error('Error fetching app users:', appError);
      return;
    }
    
    console.log('📊 Database users table analysis:');
    console.log(`  Total users in application table: ${appUsers?.length || 0}`);
    
    if (appUsers && appUsers.length > 0) {
      console.log('\n👥 Application users (ordered by creation):');
      appUsers.forEach((user, index) => {
        const passwordInfo = user.password_hash === 'admin_created' ? ' [ADMIN_CREATED]' : 
                            user.password_hash === '' ? ' [EMPTY_PASSWORD]' : 
                            user.password_hash ? ' [HAS_PASSWORD]' : ' [NO_PASSWORD]';
        console.log(`  ${index + 1}. ${user.email} (${user.id}) - ${user.first_name} ${user.last_name}${passwordInfo} - Created: ${user.created_at}`);
      });
    }
    
    const { data: currentUser, error: userError } = await supabase.auth.getUser();
    if (currentUser?.user) {
      console.log(`\n🔐 Currently authenticated as: ${currentUser.user.email} (${currentUser.user.id})`);
    } else {
      console.log('\n⚠️  Not currently authenticated - cannot access auth.users table directly');
    }
    
    console.log('\n📋 User Report Analysis:');
    console.log('  - User reported: 3 users in database, 2 in auth.users');
    console.log(`  - Current database count: ${appUsers?.length || 0}`);
    
    if (appUsers && appUsers.length === 3) {
      console.log('  ✅ Database count matches user report (3 users)');
      console.log('  🔍 Need to identify which user is missing from auth.users table');
      console.log('\n💡 Analysis of users:');
      
      const adminCreatedUsers = appUsers.filter(u => u.password_hash === 'admin_created');
      const emptyPasswordUsers = appUsers.filter(u => u.password_hash === '');
      const noPasswordUsers = appUsers.filter(u => !u.password_hash);
      
      if (adminCreatedUsers.length > 0) {
        console.log(`     - ${adminCreatedUsers.length} user(s) marked as admin_created (likely missing from auth)`);
      }
      if (emptyPasswordUsers.length > 0) {
        console.log(`     - ${emptyPasswordUsers.length} user(s) with empty password (likely missing from auth)`);
      }
      if (noPasswordUsers.length > 0) {
        console.log(`     - ${noPasswordUsers.length} user(s) with no password field (likely missing from auth)`);
      }
      
    } else if (appUsers && appUsers.length !== 3) {
      console.log(`  ⚠️  Database count (${appUsers.length}) doesn't match user report (3)`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testUserSync().catch(console.error);
