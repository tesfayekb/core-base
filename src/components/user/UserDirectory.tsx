
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, MoreHorizontal, Edit, Trash2, UserCheck } from 'lucide-react';
import { userManagementService, UserWithRoles, UserSearchFilters } from '@/services/user/UserManagementService';
import { UserForm } from './UserForm';
import { UserProfile } from './UserProfile';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PermissionBoundary } from '@/components/rbac/PermissionBoundary';

export function UserDirectory() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();
  const [showUserForm, setShowUserForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [filters, setFilters] = useState<UserSearchFilters>({
    search: '',
    status: '',
    page: 1,
    limit: 50
  });

  // Fetch users
  const { data: userResult, isLoading, error } = useQuery({
    queryKey: ['users', tenantId, filters],
    queryFn: () => userManagementService.getUsers(tenantId!, filters),
    enabled: !!tenantId,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const handleCreateUser = () => {
    setSelectedUser(null);
    setShowUserForm(true);
  };

  const handleEditUser = (user: UserWithRoles) => {
    setSelectedUser(user);
    setShowUserForm(true);
  };

  const handleViewUser = (user: UserWithRoles) => {
    setSelectedUser(user);
    setShowUserProfile(true);
  };

  const handleDeleteUser = async (user: UserWithRoles) => {
    if (!confirm(`Are you sure you want to deactivate ${user.email}?`)) {
      return;
    }

    // Implementation would call userManagementService.deleteUser
    // For now, just refresh the list
    queryClient.invalidateQueries({ queryKey: ['users', tenantId] });
  };

  const handleFormClose = () => {
    setShowUserForm(false);
    setSelectedUser(null);
    // Refresh user list after form operations
    queryClient.invalidateQueries({ queryKey: ['users', tenantId] });
  };

  const handleProfileClose = () => {
    setShowUserProfile(false);
    setSelectedUser(null);
  };

  const handleSearchChange = (value: string) => {
    setFilters(prev => ({ ...prev, search: value, page: 1 }));
  };

  const handleStatusFilterChange = (value: string) => {
    setFilters(prev => ({ ...prev, status: value === 'all' ? '' : value, page: 1 }));
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'suspended': return 'destructive';
      case 'pending_verification': return 'outline';
      default: return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading users...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-600">
            Error loading users: {error instanceof Error ? error.message : 'Unknown error'}
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
            <span>Users ({userResult?.total || 0})</span>
            <PermissionBoundary action="create" resource="users">
              <Button onClick={handleCreateUser}>
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </PermissionBoundary>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search users..."
                  value={filters.search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filters.status || 'all'} onValueChange={handleStatusFilterChange}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="pending_verification">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* User List */}
          <div className="space-y-4">
            {userResult?.users.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium">{user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.email}</h4>
                      <Badge variant={getStatusBadgeVariant(user.status) as any}>
                        {user.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    {user.roles && user.roles.length > 0 && (
                      <div className="flex items-center space-x-1 mt-1">
                        <UserCheck className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {user.roles.map(role => role.name).join(', ')}
                        </span>
                      </div>
                    )}
                    <p className="text-xs text-gray-400">
                      Created {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => handleViewUser(user)}>
                    View
                  </Button>
                  <PermissionBoundary action="update" resource="users">
                    <Button variant="ghost" size="sm" onClick={() => handleEditUser(user)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </PermissionBoundary>
                  <PermissionBoundary action="delete" resource="users">
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(user)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </PermissionBoundary>
                </div>
              </div>
            ))}
          </div>

          {userResult?.users.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No users found matching your criteria
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Form Modal */}
      {showUserForm && (
        <UserForm
          user={selectedUser}
          onClose={handleFormClose}
          tenantId={tenantId!}
        />
      )}

      {/* User Profile Modal */}
      {showUserProfile && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">User Profile</h2>
              <Button variant="ghost" size="sm" onClick={handleProfileClose}>
                ×
              </Button>
            </div>
            <div className="p-4">
              <UserProfile user={selectedUser} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
