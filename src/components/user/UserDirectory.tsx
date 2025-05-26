
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PermissionBoundary } from '@/components/rbac/PermissionBoundary';
import { UserForm } from './UserForm';
import { UserProfile } from './UserProfile';
import { UserRoleAssignment } from './UserRoleAssignment';
import { UserRoleInheritance } from './UserRoleInheritance';
import { userManagementService, UserWithRoles } from '@/services/user/UserManagementService';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Users, UserPlus, Search, Settings, Eye, Shield } from 'lucide-react';

export function UserDirectory() {
  const { user: currentUser, tenantId } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [showRoleAssignment, setShowRoleAssignment] = useState<UserWithRoles | null>(null);
  const [showRoleInheritance, setShowRoleInheritance] = useState<UserWithRoles | null>(null);

  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ['users', tenantId, searchTerm, statusFilter],
    queryFn: async () => {
      if (!tenantId || !currentUser?.id) return [];
      
      const result = await userManagementService.getUsers({
        tenantId,
        search: searchTerm || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter as any,
        limit: 50
      }, currentUser.id);
      
      if (!result.success) {
        toast({
          title: 'Error',
          description: result.error || 'Failed to load users',
          variant: 'destructive'
        });
        return [];
      }
      
      return result.data || [];
    },
    enabled: !!tenantId && !!currentUser?.id
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'suspended': return 'destructive';
      case 'pending_verification': return 'outline';
      default: return 'secondary';
    }
  };

  const handleCreateUser = () => {
    setSelectedUser(null);
    setShowUserForm(true);
  };

  const handleEditUser = (user: UserWithRoles) => {
    setSelectedUser(user);
    setShowUserForm(true);
  };

  const handleCloseForm = () => {
    setShowUserForm(false);
    setSelectedUser(null);
    refetch();
  };

  const handleManageRoles = (user: UserWithRoles) => {
    setShowRoleAssignment(user);
  };

  const handleViewInheritance = (user: UserWithRoles) => {
    setShowRoleInheritance(user);
  };

  const handleCloseRoleAssignment = () => {
    setShowRoleAssignment(null);
    refetch();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>User Directory</span>
            </div>
            <PermissionBoundary action="Create" resource="users">
              <Button onClick={handleCreateUser}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </PermissionBoundary>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="pending_verification">Pending Verification</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          {isLoading ? (
            <div className="text-center py-8">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No users found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {user.first_name || user.last_name 
                            ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                            : 'Unnamed User'
                          }
                        </div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(user.status) as any}>
                        {user.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles && user.roles.length > 0 ? (
                          user.roles.slice(0, 2).map((role) => (
                            <Badge key={role.id} variant="outline" className="text-xs">
                              {role.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">No roles</span>
                        )}
                        {user.roles && user.roles.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{user.roles.length - 2} more
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {user.last_login_at 
                          ? new Date(user.last_login_at).toLocaleDateString()
                          : 'Never'
                        }
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedUser(user)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <PermissionBoundary action="Update" resource="users">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        </PermissionBoundary>
                        <PermissionBoundary action="Manage" resource="roles">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleManageRoles(user)}
                          >
                            <Shield className="h-4 w-4" />
                          </Button>
                        </PermissionBoundary>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* User Profile Modal */}
      {selectedUser && !showUserForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">User Profile</h3>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewInheritance(selectedUser)}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    View Role Inheritance
                  </Button>
                  <Button variant="ghost" onClick={() => setSelectedUser(null)}>
                    ×
                  </Button>
                </div>
              </div>
              <UserProfile user={selectedUser} />
            </div>
          </div>
        </div>
      )}

      {/* User Form Modal */}
      {showUserForm && (
        <UserForm
          user={selectedUser}
          onClose={handleCloseForm}
          tenantId={tenantId || ''}
        />
      )}

      {/* Role Assignment Modal */}
      {showRoleAssignment && (
        <UserRoleAssignment
          user={showRoleAssignment}
          onClose={handleCloseRoleAssignment}
        />
      )}

      {/* Role Inheritance Modal */}
      {showRoleInheritance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Role Inheritance</h3>
                <Button variant="ghost" onClick={() => setShowRoleInheritance(null)}>
                  ×
                </Button>
              </div>
              <UserRoleInheritance user={showRoleInheritance} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
