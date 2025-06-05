import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from '@/services/database';
import { useAuth } from '@/components/auth/AuthProvider';

export function QuickRoleFix() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const quickFix = async () => {
    setIsLoading(true);
    setMessage('');

    try {
      if (!user?.email) {
        setMessage('❌ No user logged in');
        return;
      }

      console.log('🔧 Quick fix for:', user.email);

      const { data: userData, error: userError } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email,
          first_name: 'Bethany',
          last_name: 'Tesfaye',
          status: 'active'
        })
        .select()
        .single();

      if (userError) {
        console.error('User upsert error:', userError);
        setMessage(`❌ User error: ${userError.message}`);
        return;
      }

      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('id, name')
        .eq('name', 'SuperAdmin')
        .single();

      if (roleError || !roleData) {
        console.error('Role error:', roleError);
        setMessage(`❌ Role error: ${roleError?.message || 'SuperAdmin role not found'}`);
        return;
      }

      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userData.id);

      const { error: assignError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userData.id,
          role_id: roleData.id,
          tenant_id: null
        });

      if (assignError) {
        console.error('Assignment error:', assignError);
        setMessage(`❌ Assignment error: ${assignError.message}`);
        return;
      }

      setMessage('✅ SuperAdmin role assigned! Refresh page to see changes.');

    } catch (error) {
      console.error('Unexpected error:', error);
      setMessage(`❌ Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto mt-4">
      <CardHeader>
        <CardTitle>Quick Role Fix</CardTitle>
        <CardDescription>
          Assign SuperAdmin role to current user
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={quickFix}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Fixing...' : 'Fix My Role'}
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
