import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from '@/services/database';
import { useAuth } from '@/components/auth/AuthProvider';

export function DirectRoleAssignment() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const assignDirectly = async () => {
    setIsLoading(true);
    setMessage('');

    try {
      if (!user?.id) {
        setMessage('❌ No user ID available');
        return;
      }

      console.log('🔧 Direct assignment for user ID:', user.id);

      const { data: userData, error: userError } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email || 'bethany@bethany.com',
          first_name: 'Bethany',
          last_name: 'Tesfaye',
          status: 'active'
        })
        .select()
        .single();

      if (userError) {
        console.error('User upsert failed:', userError);
        setMessage(`❌ User upsert failed: ${userError.message}`);
        return;
      }

      console.log('✅ User record ready:', userData);

      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('id, name')
        .eq('name', 'SuperAdmin')
        .single();

      if (roleError || !roleData) {
        console.error('Role lookup failed:', roleError);
        setMessage(`❌ Role lookup failed: ${roleError?.message || 'SuperAdmin role not found'}`);
        return;
      }

      console.log('✅ SuperAdmin role found:', roleData);

      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userData.id);

      if (deleteError) {
        console.warn('Delete existing roles warning:', deleteError);
      }

      const { data: insertData, error: insertError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userData.id,
          role_id: roleData.id,
          tenant_id: null
        })
        .select();

      if (insertError) {
        console.error('Role assignment failed:', insertError);
        setMessage(`❌ Role assignment failed: ${insertError.message}`);
        return;
      }

      console.log('✅ Role assignment successful:', insertData);

      const { data: verifyData, error: verifyError } = await supabase
        .from('user_roles')
        .select(`
          id,
          tenant_id,
          roles (
            name
          )
        `)
        .eq('user_id', userData.id);

      if (verifyError) {
        console.error('Verification failed:', verifyError);
        setMessage(`❌ Verification failed: ${verifyError.message}`);
        return;
      }

      console.log('🎯 Final verification:', verifyData);
      setMessage(`✅ SUCCESS! SuperAdmin role assigned. Found ${verifyData?.length || 0} role(s). Please refresh the page to see changes.`);

    } catch (error) {
      console.error('Unexpected error:', error);
      setMessage(`❌ Unexpected error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto mt-4">
      <CardHeader>
        <CardTitle>Direct Role Assignment</CardTitle>
        <CardDescription>
          Direct database assignment of SuperAdmin role
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={assignDirectly}
          disabled={isLoading}
          className="w-full"
          variant="destructive"
        >
          {isLoading ? 'Assigning Role...' : 'Direct SuperAdmin Assignment'}
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
