
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

export function UserProfile() {
  const { user } = useAuth();

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm:ss');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
  };

  // Cast user to UserWithRoles type for access to extended properties
  const userWithRoles = user as any;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Header Section */}
      <div className="text-center">
        <h2 className="text-2xl font-semibold">Your Profile</h2>
        <p className="text-muted-foreground">View and manage your profile information.</p>
      </div>

      {/* User Information */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Email */}
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Email</Label>
            <p className="text-sm font-semibold">{user?.email || 'N/A'}</p>
          </div>

          {/* First Name */}
          <div>
            <Label className="text-sm font-medium text-muted-foreground">First Name</Label>
            <p className="text-sm">{userWithRoles?.first_name || 'N/A'}</p>
          </div>

          {/* Last Name */}
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Last Name</Label>
            <p className="text-sm">{userWithRoles?.last_name || 'N/A'}</p>
          </div>

          {/* Status */}
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Status</Label>
            <Badge variant={userWithRoles?.status === 'active' ? 'default' : 'secondary'}>
              {userWithRoles?.status || 'N/A'}
            </Badge>
          </div>

          {/* Roles */}
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Roles</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {userWithRoles?.user_roles && userWithRoles.user_roles.length > 0 ? (
                userWithRoles.user_roles.map((userRole: any) => (
                  <Badge key={userRole.id} variant="secondary">
                    {userRole.roles?.name || 'Unknown Role'}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">No roles assigned</span>
              )}
            </div>
          </div>

          {/* Tenant Information */}
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Tenant</Label>
            <p className="text-sm">
              {userWithRoles?.tenant?.name || 'No Tenant Assigned'}
            </p>
          </div>

          {/* Created At */}
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Created At</Label>
            <p className="text-sm">{formatDate(userWithRoles?.created_at)}</p>
          </div>

          {/* Email Verified At */}
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Email Verified At</Label>
            <p className="text-sm">{formatDate(userWithRoles?.email_verified_at)}</p>
          </div>

          {/* Last Login At */}
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Last Login At</Label>
            <p className="text-sm">{formatDate(userWithRoles?.last_login_at)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Additional Information or Actions can be added here */}
      <div className="text-center text-muted-foreground">
        <p className="text-sm">
          For assistance or further information, please contact your administrator.
        </p>
      </div>
    </div>
  );
}
