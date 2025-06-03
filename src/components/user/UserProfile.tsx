
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserWithRoles } from '@/types/user';
import { format } from 'date-fns';

interface UserProfileProps {
  user: UserWithRoles;
}

export function UserProfile({ user }: UserProfileProps) {
  const getUserInitials = () => {
    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || user.email.charAt(0).toUpperCase();
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: 'default' as const, label: 'Active' },
      pending_verification: { variant: 'secondary' as const, label: 'Pending' },
      suspended: { variant: 'destructive' as const, label: 'Suspended' },
      inactive: { variant: 'outline' as const, label: 'Inactive' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg">
              {getUserInitials()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-xl font-semibold">
              {user.first_name && user.last_name
                ? `${user.first_name} ${user.last_name}`
                : user.email
              }
            </h3>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <div className="mt-2">
              {getStatusBadge(user.status)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-sm text-muted-foreground">Member Since</h4>
            <p>{format(new Date(user.created_at), 'PPP')}</p>
          </div>
          <div>
            <h4 className="font-medium text-sm text-muted-foreground">Last Login</h4>
            <p>
              {user.last_login_at
                ? format(new Date(user.last_login_at), 'PPp')
                : 'Never'
              }
            </p>
          </div>
        </div>

        <div>
          <h4 className="font-medium text-sm text-muted-foreground mb-2">Roles</h4>
          <div className="flex flex-wrap gap-2">
            {user.user_roles && user.user_roles.length > 0 ? (
              user.user_roles.map((userRole) => (
                <Badge key={userRole.id} variant="outline">
                  {userRole.role.name}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">No roles assigned</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
