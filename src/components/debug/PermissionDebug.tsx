
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export function PermissionDebug() {
  const { user, currentTenantId } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkUserData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Check if user exists in our users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      // Check user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select(`
          *,
          roles (
            id,
            name,
            description
          )
        `)
        .eq('user_id', user.id);

      // Check permissions
      const { data: permissions, error: permError } = await supabase
        .rpc('get_user_permissions', {
          p_user_id: user.id
        });

      // Check if user is SuperAdmin
      const { data: isSuperAdmin, error: superAdminError } = await supabase
        .rpc('is_super_admin', {
          p_user_id: user.id
        });

      // Get all users to see if there are any
      const { data: allUsers, error: allUsersError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, status, tenant_id');

      setDebugInfo({
        userData,
        userError,
        userRoles,
        rolesError,
        permissions,
        permError,
        isSuperAdmin,
        superAdminError,
        allUsers,
        allUsersError,
        currentTenantId
      });
    } catch (error) {
      console.error('Debug check failed:', error);
      setDebugInfo({ error: error.message });
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      checkUserData();
    }
  }, [user, currentTenantId]);

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Permission Debug</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No user logged in</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permission Debug Info</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold">User Info:</h3>
            <p>Email: {user.email}</p>
            <p>ID: {user.id}</p>
            <p>Tenant ID: {currentTenantId}</p>
          </div>

          {debugInfo && (
            <>
              <div>
                <h3 className="font-semibold">User in Database:</h3>
                <pre className="text-xs bg-gray-100 p-2 rounded">
                  {JSON.stringify(debugInfo.userData, null, 2)}
                </pre>
                {debugInfo.userError && (
                  <p className="text-red-600">Error: {debugInfo.userError.message}</p>
                )}
              </div>

              <div>
                <h3 className="font-semibold">Roles ({debugInfo.userRoles?.length || 0}):</h3>
                {debugInfo.userRoles?.map((role: any) => (
                  <div key={role.id}>
                    {role.roles?.name}
                  </div>
                ))}
                {debugInfo.rolesError && (
                  <p className="text-red-600">Error: {debugInfo.rolesError.message}</p>
                )}
              </div>

              <div>
                <h3 className="font-semibold">Permissions ({debugInfo.permissions?.length || 0}):</h3>
                {debugInfo.permissions?.map((perm: any, idx: number) => (
                  <div key={idx}>
                    {perm.action}:{perm.resource}
                  </div>
                ))}
                {debugInfo.permError && (
                  <p className="text-red-600">Error: {debugInfo.permError.message}</p>
                )}
              </div>

              <div>
                <h3 className="font-semibold">Is SuperAdmin:</h3>
                <p>{debugInfo.isSuperAdmin ? 'Yes' : 'No'}</p>
                {debugInfo.superAdminError && (
                  <p className="text-red-600">Error: {debugInfo.superAdminError.message}</p>
                )}
              </div>

              <div>
                <h3 className="font-semibold">All Users in System ({debugInfo.allUsers?.length || 0}):</h3>
                <pre className="text-xs bg-gray-100 p-2 rounded max-h-40 overflow-y-auto">
                  {JSON.stringify(debugInfo.allUsers, null, 2)}
                </pre>
                {debugInfo.allUsersError && (
                  <p className="text-red-600">Error: {debugInfo.allUsersError.message}</p>
                )}
              </div>
            </>
          )}

          <Button onClick={checkUserData} disabled={loading}>
            {loading ? 'Checking...' : 'Refresh Debug Info'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
