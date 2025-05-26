
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Calendar, Shield, Activity } from 'lucide-react';
import { UserWithRoles } from '@/services/user/UserManagementService';

interface UserProfileProps {
  user: UserWithRoles;
}

export function UserProfile({ user }: UserProfileProps) {
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'suspended': return 'destructive';
      case 'pending_verification': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>User Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Full Name</label>
              <p className="text-sm">
                {user.first_name && user.last_name 
                  ? `${user.first_name} ${user.last_name}`
                  : 'No name set'
                }
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <p className="text-sm flex items-center">
                <Mail className="h-3 w-3 mr-1" />
                {user.email}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <div>
                <Badge variant={getStatusBadgeVariant(user.status)}>
                  {user.status.replace('_', ' ')}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Created</label>
              <p className="text-sm flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                {new Date(user.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Roles and Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Roles & Permissions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {user.roles && user.roles.length > 0 ? (
            <div className="space-y-3">
              {user.roles.map((userRole) => (
                <div key={userRole.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{userRole.role.name}</div>
                    {userRole.assigned_at && (
                      <div className="text-sm text-muted-foreground">
                        Assigned on {new Date(userRole.assigned_at).toLocaleDateString()}
                      </div>
                    )}
                    {userRole.role.description && (
                      <div className="text-sm text-muted-foreground">
                        {userRole.role.description}
                      </div>
                    )}
                  </div>
                  <Badge variant={userRole.role.is_system_role ? "secondary" : "outline"}>
                    {userRole.role.is_system_role ? "System Role" : "Custom Role"}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No roles assigned</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Activity Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">
                {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : 'Never'}
              </div>
              <div className="text-sm text-muted-foreground">Last Login</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{user.failed_login_attempts || 0}</div>
              <div className="text-sm text-muted-foreground">Failed Login Attempts</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">
                {user.email_verified_at ? 'Verified' : 'Unverified'}
              </div>
              <div className="text-sm text-muted-foreground">Email Status</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
