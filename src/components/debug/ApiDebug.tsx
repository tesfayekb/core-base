import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from '@/services/database';
import { useAuth } from '@/components/auth/AuthProvider';

export function ApiDebug() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<string>('');

  const testApiRequests = async () => {
    setIsLoading(true);
    setResults('');
    
    const logs: string[] = [];
    
    try {
      logs.push('🔍 Testing API requests for user: ' + user?.email);
      logs.push('User ID: ' + user?.id);
      
      logs.push('\n--- Testing user_roles query (SuperAdmin check) ---');
      const { data: superAdminData, error: superAdminError } = await supabase
        .from('user_roles')
        .select(`
          id,
          tenant_id,
          roles (
            name,
            is_system_role
          )
        `)
        .eq('user_id', user?.id)
        .is('tenant_id', null);

      if (superAdminError) {
        logs.push('❌ SuperAdmin query error: ' + JSON.stringify(superAdminError, null, 2));
      } else {
        logs.push('✅ SuperAdmin query success: ' + JSON.stringify(superAdminData, null, 2));
      }

      logs.push('\n--- Testing user_roles query (all roles) ---');
      const { data: allRolesData, error: allRolesError } = await supabase
        .from('user_roles')
        .select(`
          id,
          tenant_id,
          roles (
            name,
            is_system_role
          )
        `)
        .eq('user_id', user?.id);

      if (allRolesError) {
        logs.push('❌ All roles query error: ' + JSON.stringify(allRolesError, null, 2));
      } else {
        logs.push('✅ All roles query success: ' + JSON.stringify(allRolesData, null, 2));
      }

      logs.push('\n--- Testing users table query ---');
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name')
        .limit(5);

      if (usersError) {
        logs.push('❌ Users query error: ' + JSON.stringify(usersError, null, 2));
      } else {
        logs.push('✅ Users query success: ' + JSON.stringify(usersData, null, 2));
      }

      logs.push('\n--- Testing roles table query ---');
      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select('id, name, is_system_role')
        .limit(5);

      if (rolesError) {
        logs.push('❌ Roles query error: ' + JSON.stringify(rolesError, null, 2));
      } else {
        logs.push('✅ Roles query success: ' + JSON.stringify(rolesData, null, 2));
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
        <CardTitle>API Debug Tool</CardTitle>
        <CardDescription>
          Test API requests to diagnose 406 errors and permission issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={testApiRequests}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Testing API Requests...' : 'Test API Requests'}
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
