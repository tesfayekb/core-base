
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { Users, Search, UserPlus, Settings, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { userManagementService, UserWithRoles } from '@/services/user/UserManagementService';
import { UserForm } from './UserForm';
import { UserRoleAssignment } from './UserRoleAssignment';
import { UserProfile } from './UserProfile';

export function UserDirectory() {
  const { tenantId } = useAuth();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [showRoleAssignment, setShowRoleAssignment] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['users', tenantId, search, status],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const result = await userManagementService.getUsers({
        tenantId,
        search: search || undefined,
        status: status === 'all' ? undefined : status,
        limit: 50
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch users');
      }
      
      return result.data || [];
    },
    enabled: !!tenantId
  });

  const getStatusBadgeVariant = (userStatus: string) => {
    switch (userStatus) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'suspended': return 'destructive';
      case 'pending_verification': return 'outline';
      default: return 'secondary';
    }
  };

  const handleUserAction = (user: UserWithRoles, action: 'profile' | 'roles' | 'edit') => {
    setSelectedUser(user);
    switch (action) {
      case 'profile':
        setShowUserProfile(true);
        break;
      case 'roles':
        setShowRoleAssignment(true);
        break;
      case 'edit':
        setShowUserForm(true);
        break;
    }
  };

  const closeModals = () => {
    setSelectedUser(null);
    setShowUserForm(false);
    setShowRoleAssignment(false);
    setShowUserProfile(false);
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>User Directory</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-red-600">
            Failed to load users: {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>User Directory</span>
            </div>
            <Button onClick={() => setShowUserForm(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="pending_verification">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Users List */}
          {isLoading ? (
            <div className="text-center py-6">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <h3 className="font-medium mb-2">No Users Found</h3>
              <p className="text-sm">
                {search || status !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Get started by adding your first user'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div>
                        <div className="font-medium">
                          {user.first_name && user.last_name 
                            ? `${user.first_name} ${user.last_name}`
                            : user.email
                          }
                        </div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                      <Badge variant={getStatusBadgeVariant(user.status)}>
                        {user.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center space-x-4 text-xs text-muted-foreground">
                      <span>
                        Roles: {user.roles?.length || 0}
                      </span>
                      <span>
                        Created: {new Date(user.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUserAction(user, 'profile')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUserAction(user, 'roles')}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUserAction(user, 'edit')}
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {showUserForm && (
        <UserForm
          user={selectedUser}
          onClose={closeModals}
          tenantId={tenantId || ''}
        />
      )}

      {showRoleAssignment && selectedUser && (
        <UserRoleAssignment
          user={selectedUser}
          onClose={closeModals}
        />
      )}

      {showUserProfile && selectedUser && (
        <UserProfile user={selectedUser} />
      )}
    </>
  );
}
