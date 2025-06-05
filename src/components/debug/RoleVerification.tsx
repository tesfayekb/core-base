import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from '@/services/database';
import { useAuth } from '@/components/auth/AuthProvider';

export function RoleVerification() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<string>('');

  const verifyRoleSetup = async () => {
    setIsLoading(true);
    setResults('');
    
    const logs: string[] = [];
    
    try {
      logs.push('🔍 Role Verification for user: ' + user?.email);
      logs.push('User ID: ' + user?.id);
      
      logs.push('\n--- Step 1: Check user exists in users table ---');
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, status')
        .eq('id', user?.id)
        .single();

      if (userError) {
        logs.push('❌ User not found in users table: ' + JSON.stringify(userError, null, 2));
      } else {
        logs.push('✅ User found in users table: ' + JSON.stringify(userData, null, 2));
      }

      logs.push('\n--- Step 2: Check SuperAdmin role exists ---');
      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('id, name, is_system_role')
        .eq('name', 'SuperAdmin')
        .single();

      if (roleError) {
        logs.push('❌ SuperAdmin role not found: ' + JSON.stringify(roleError, null, 2));
      } else {
        logs.push('✅ SuperAdmin role found: ' + JSON.stringify(roleData, null, 2));
      }

      logs.push('\n--- Step 3: Check user_roles assignments ---');
      const { data: userRoles, error: userRolesError } = await supabase
        .from('user_roles')
        .select(`
          id,
          tenant_id,
          created_at,
          roles!user_roles_role_id_fkey (
            id,
            name,
            is_system_role
          )
        `)
        .eq('user_id', user?.id);

      if (userRolesError) {
        logs.push('❌ Error fetching user roles: ' + JSON.stringify(userRolesError, null, 2));
      } else {
        logs.push('✅ User roles found: ' + JSON.stringify(userRoles, null, 2));
        
        const superAdminAssignment = userRoles?.find(ur => 
          ur.roles?.name === 'SuperAdmin' && ur.tenant_id === null
        );
        
        if (superAdminAssignment) {
          logs.push('✅ SuperAdmin assignment confirmed: ' + JSON.stringify(superAdminAssignment, null, 2));
        } else {
          logs.push('❌ No SuperAdmin assignment found with tenant_id = null');
        }
      }

      logs.push('\n--- Step 4: Test role detection query ---');
      const { data: roleTestData, error: roleTestError } = await supabase
        .from('user_roles')
        .select(`
          id,
          tenant_id,
          roles!user_roles_role_id_fkey (
            name
          )
        `)
        .eq('user_id', user?.id)
        .is('tenant_id', null);

      if (roleTestError) {
        logs.push('❌ Role detection query failed: ' + JSON.stringify(roleTestError, null, 2));
      } else {
        logs.push('✅ Role detection query success: ' + JSON.stringify(roleTestData, null, 2));
      }

    } catch (error) {
      logs.push('❌ Unexpected error: ' + JSON.stringify(error, null, 2));
    }
    
    setResults(logs.join('\n'));
    setIsLoading(false);
  };

  if (!user) return null;

  return (
    <Card className="w-full max-w-4xl mx-auto mt-4">
      <CardHeader>
        <CardTitle>Role Verification</CardTitle>
        <CardDescription>
          Comprehensive verification of role setup and detection
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={verifyRoleSetup}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Verifying Role Setup...' : 'Verify Role Setup'}
        </Button>
        {results && (
          <div className="text-xs p-4 bg-gray-100 rounded border whitespace-pre-wrap font-mono max-h-96 overflow-y-auto">
            {results}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
