import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from '@/services/database';
import { useAuth } from '@/components/auth/AuthProvider';

export function DatabaseConnectionTest() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<string>('');

  const testConnection = async () => {
    setIsLoading(true);
    setResults('');
    
    const logs: string[] = [];
    
    try {
      logs.push('🔍 Database Connection Test');
      logs.push('User: ' + user?.email);
      logs.push('User ID: ' + user?.id);
      
      logs.push('\n--- Test 1: Basic connection ---');
      const { data: healthData, error: healthError } = await supabase
        .from('users')
        .select('count')
        .limit(1);

      if (healthError) {
        logs.push('❌ Basic connection failed: ' + JSON.stringify(healthError, null, 2));
      } else {
        logs.push('✅ Basic connection successful');
      }

      logs.push('\n--- Test 2: Check table schema ---');
      const { data: schemaData, error: schemaError } = await supabase
        .from('user_roles')
        .select('*')
        .limit(0);

      if (schemaError) {
        logs.push('❌ Schema check failed: ' + JSON.stringify(schemaError, null, 2));
      } else {
        logs.push('✅ Schema accessible');
      }

      logs.push('\n--- Test 3: Raw user_roles query ---');
      const { data: rawData, error: rawError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user?.id);

      if (rawError) {
        logs.push('❌ Raw query failed: ' + JSON.stringify(rawError, null, 2));
      } else {
        logs.push('✅ Raw query successful: ' + JSON.stringify(rawData, null, 2));
      }

      logs.push('\n--- Test 4: Check roles table ---');
      const { data: rolesTableData, error: rolesTableError } = await supabase
        .from('roles')
        .select('*')
        .limit(5);

      if (rolesTableError) {
        logs.push('❌ Roles table query failed: ' + JSON.stringify(rolesTableError, null, 2));
      } else {
        logs.push('✅ Roles table query successful: ' + JSON.stringify(rolesTableData, null, 2));
      }

      logs.push('\n--- Test 5: Manual join query ---');
      const { data: manualJoinData, error: manualJoinError } = await supabase
        .from('user_roles')
        .select(`
          *,
          roles (*)
        `)
        .eq('user_id', user?.id);

      if (manualJoinError) {
        logs.push('❌ Manual join failed: ' + JSON.stringify(manualJoinError, null, 2));
      } else {
        logs.push('✅ Manual join successful: ' + JSON.stringify(manualJoinData, null, 2));
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
        <CardTitle>Database Connection Test</CardTitle>
        <CardDescription>
          Test database connectivity and foreign key relationships
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={testConnection}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Testing Connection...' : 'Test Database Connection'}
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
