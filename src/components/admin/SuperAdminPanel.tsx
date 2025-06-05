import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from '@/services/database';
import { useAuth } from '@/components/auth/AuthProvider';

export function SuperAdminPanel() {
  const { user } = useAuth();
  const [email, setEmail] = useState('bethany@bethany.com');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleAssignSuperAdmin = async () => {
    setIsLoading(true);
    setMessage('');

    try {
      console.log('🔧 Starting SuperAdmin assignment for:', email);

      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        console.error('Error fetching auth users:', authError);
        setMessage(`❌ Error accessing auth users: ${authError.message}`);
        return;
      }

      const authUser = authUsers.users.find(u => u.email === email);
      if (!authUser) {
        setMessage(`❌ User ${email} not found in authentication system`);
        return;
      }

      console.log('✅ Found auth user:', authUser.id);

      const { data: userData, error: userError } = await supabase
        .from('users')
        .upsert({
          id: authUser.id,
          email: authUser.email,
          first_name: authUser.user_metadata?.first_name || 'Bethany',
          last_name: authUser.user_metadata?.last_name || 'Tesfaye',
          status: 'active'
        })
        .select()
        .single();

      if (userError) {
        console.error('Error creating/updating user profile:', userError);
        setMessage(`❌ Error creating user profile: ${userError.message}`);
        return;
      }

      console.log('✅ User profile created/updated:', userData);

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

      const { data: existingRole, error: checkError } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userData.id)
        .eq('role_id', roleData.id)
        .single();

      if (existingRole) {
        setMessage(`✅ User ${email} already has SuperAdmin role`);
        return;
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

      console.log('✅ Successfully assigned SuperAdmin role');
      setMessage(`✅ Successfully assigned SuperAdmin role to ${email}! Please refresh the page to see changes.`);

    } catch (error) {
      console.error('Unexpected error in SuperAdmin assignment:', error);
      setMessage(`❌ Unexpected error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle>SuperAdmin Role Assignment</CardTitle>
        <CardDescription>
          Assign SuperAdmin role for full system access
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Input
            type="email"
            placeholder="User email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <Button 
          onClick={handleAssignSuperAdmin}
          disabled={isLoading || !email}
          className="w-full"
        >
          {isLoading ? 'Assigning SuperAdmin Role...' : 'Assign SuperAdmin Role'}
        </Button>
        {message && (
          <div className={`text-sm p-3 rounded border ${
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
