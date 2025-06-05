import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from '@/services/database';
import { useAuth } from '@/components/auth/AuthProvider';

export function SimpleRoleTest() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const testSimpleAssignment = async () => {
    setIsLoading(true);
    setMessage('');

    try {
      if (!user?.id) {
        setMessage('❌ No user ID');
        return;
      }

      console.log('🧪 Simple test for user:', user.id);

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
        setMessage(`❌ User upsert failed: ${userError.message}`);
        return;
      }

      const { data: roleData } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'SuperAdmin')
        .single();

      if (!roleData) {
        setMessage('❌ SuperAdmin role not found');
        return;
      }

      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', user.id);

      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role_id: roleData.id,
          tenant_id: null
        });

      if (insertError) {
        setMessage(`❌ Insert failed: ${insertError.message}`);
        return;
      }

      const { data: verifyData } = await supabase
        .from('user_roles')
        .select(`
          id,
          tenant_id,
          roles!user_roles_role_id_fkey (
            name
          )
        `)
        .eq('user_id', user.id);

      setMessage(`✅ Assignment complete! Found ${verifyData?.length || 0} role(s). Refresh page.`);

    } catch (error) {
      setMessage(`❌ Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto mt-4">
      <CardHeader>
        <CardTitle>Simple Role Test</CardTitle>
        <CardDescription>
          Minimal SuperAdmin assignment test
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={testSimpleAssignment}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Testing...' : 'Simple Test'}
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
