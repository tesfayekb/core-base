import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from '@/services/database';
import { useAuth } from '@/components/auth/AuthProvider';

export function RoleAssignmentFix() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fixBethanyRole = async () => {
    setIsLoading(true);
    setMessage('');

    try {
      console.log('🔧 Fixing bethany@bethany.com SuperAdmin role assignment...');

      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        console.error('Error fetching auth users:', authError);
        setMessage(`❌ Error accessing auth users: ${authError.message}`);
        return;
      }

      const bethanyAuth = authUsers.users.find(u => u.email === 'bethany@bethany.com');
      if (!bethanyAuth) {
        setMessage(`❌ bethany@bethany.com not found in auth system`);
        return;
      }

      console.log('✅ Found bethany in auth:', bethanyAuth.id);

      const { data: userData, error: userError } = await supabase
        .from('users')
        .upsert({
          id: bethanyAuth.id,
          email: 'bethany@bethany.com',
          first_name: 'Bethany',
          last_name: 'Tesfaye',
          status: 'active'
        })
        .select()
        .single();

      if (userError) {
        console.error('Error creating/updating user:', userError);
        setMessage(`❌ Error with user record: ${userError.message}`);
        return;
      }

      console.log('✅ User record ready:', userData);

      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('id, name')
        .eq('name', 'SuperAdmin')
        .single();

      if (roleError || !roleData) {
        console.error('SuperAdmin role not found:', roleError);
        setMessage(`❌ SuperAdmin role not found: ${roleError?.message || 'Role does not exist'}`);
        return;
      }

      console.log('✅ Found SuperAdmin role:', roleData);

      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userData.id);

      if (deleteError) {
        console.warn('Warning removing existing roles:', deleteError);
      }

      const { error: assignError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userData.id,
          role_id: roleData.id,
          tenant_id: null, // NULL for system-wide SuperAdmin access
          assigned_by: user?.id || userData.id
        });

      if (assignError) {
        console.error('Error assigning SuperAdmin role:', assignError);
        setMessage(`❌ Error assigning SuperAdmin role: ${assignError.message}`);
        return;
      }

      console.log('✅ Successfully assigned SuperAdmin role with NULL tenant_id');

      const { data: verifyData, error: verifyError } = await supabase
        .from('user_roles')
        .select(`
          id,
          tenant_id,
          created_at,
          roles!user_roles_role_id_fkey(name)
        `)
        .eq('user_id', userData.id);

      if (verifyError) {
        console.error('Error verifying role assignment:', verifyError);
        setMessage(`❌ Error verifying assignment: ${verifyError.message}`);
        return;
      }

      console.log('🎯 Final role verification:', verifyData);
      setMessage(`✅ Successfully assigned SuperAdmin role to bethany@bethany.com! Please refresh the page to see changes. Role assignments: ${JSON.stringify(verifyData, null, 2)}`);

    } catch (error) {
      console.error('Unexpected error in role assignment:', error);
      setMessage(`❌ Unexpected error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto mt-4">
      <CardHeader>
        <CardTitle>Fix Bethany SuperAdmin Role</CardTitle>
        <CardDescription>
          Assign SuperAdmin role with NULL tenant_id for system-wide access
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={fixBethanyRole}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Fixing Role Assignment...' : 'Fix Bethany SuperAdmin Role'}
        </Button>
        {message && (
          <div className={`text-sm p-3 rounded border whitespace-pre-wrap ${
            message.includes('✅') 
              ? 'bg-green-50 text-green-800 border-green-200' 
              : 'bg-red-50 text-red-800 border-red-200'
          }`}>
            {message}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
