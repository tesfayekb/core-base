import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { UserForm } from './UserForm';
import { UserRoleAssignment } from './UserRoleAssignment';
import { BulkUserActions } from './BulkUserActions';
import { UserAuditTrail } from './UserAuditTrail';
import { useQuery } from '@tanstack/react-query';
import { userManagementService, UserWithRoles } from '@/services/user/UserManagementService';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Shield,
  Mail,
  Calendar,
  MoreVertical,
  History,
  Settings
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function UserDirectory() {
  const { user: currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [showRoleAssignment, setShowRoleAssignment] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState('directory');

  // For now, we'll use a default tenant ID. In a real app, this would come from context
  const tenantId = 'default-tenant';

  const { data: usersResult, isLoading, error, refetch } = useQuery({
    queryKey: ['users', tenantId, page, searchTerm],
    queryFn: () => userManagementService.getUsers(tenantId, page, 10),
    enabled: !!tenantId
  });

  // Extract users array from the paginated result
  const users = usersResult?.data || [];

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditUser = (user: UserWithRoles) => {
    setSelectedUser(user);
    setShowUserForm(true);
  };

  const handleManageRoles = (userId: string) => {
    setShowRoleAssignment(userId);
  };

  const handleCloseForm = () => {
    setShowUserForm(false);
    setSelectedUser(null);
  };

  const handleCloseRoleAssignment = () => {
    setShowRoleAssignment(null);
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(filteredUsers.map(user => user.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleOperationComplete = () => {
    refetch();
    setSelectedUsers([]);
  };

  if (showUserForm) {
    return (
      <UserForm
        user={selectedUser}
        onClose={handleCloseForm}
        tenantId={tenantId}
      />
    );
  }

  if (showRoleAssignment) {
    return (
      <UserRoleAssignment
        userId={showRoleAssignment}
        tenantId={tenantId}
        onClose={handleCloseRoleAssignment}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="h-5 w-5" />
          <h2 className="text-2xl font-bold">User Management</h2>
        </div>
        <Button onClick={() => setShowUserForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="directory" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Directory
          </TabsTrigger>
          <TabsTrigger value="bulk-actions" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Bulk Actions
          </TabsTrigger>
          <TabsTrigger value="audit-trail" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Audit Trail
          </TabsTrigger>
        </TabsList>

        <TabsContent value="directory" className="space-y-6">
          {/* Search and Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search users by email or name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Users List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Users ({filteredUsers.length})</CardTitle>
                {filteredUsers.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedUsers.length === filteredUsers.length}
                      onCheckedChange={handleSelectAll}
                    />
                    <span className="text-sm text-muted-foreground">
                      Select All ({selectedUsers.length} selected)
                    </span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading users...</p>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-red-600">Failed to load users</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {searchTerm ? 'No users found matching your search' : 'No users found'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredUsers.map((user) => (
                    <div key={user.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-start space-x-4">
                          <Checkbox
                            checked={selectedUsers.includes(user.id)}
                            onCheckedChange={(checked) => handleSelectUser(user.id, checked as boolean)}
                          />
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="font-semibold">
                                {user.first_name || user.last_name 
                                  ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                                  : 'No name set'
                                }
                              </h3>
                              <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                                {user.status}
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                              <div className="flex items-center space-x-1">
                                <Mail className="h-3 w-3" />
                                <span>{user.email}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-3 w-3" />
                                <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                            {user.roles && user.roles.length > 0 && (
                              <div className="flex items-center space-x-2 mt-2">
                                <Shield className="h-3 w-3 text-muted-foreground" />
                                <div className="flex flex-wrap gap-1">
                                  {user.roles.map((userRole) => (
                                    <Badge 
                                      key={userRole.id} 
                                      variant="outline" 
                                      className="text-xs"
                                    >
                                      {userRole.role.name}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditUser(user)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit User
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleManageRoles(user.id)}>
                              <Shield className="h-4 w-4 mr-2" />
                              Manage Roles
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk-actions">
          <BulkUserActions
            selectedUsers={selectedUsers}
            tenantId={tenantId}
            onOperationComplete={handleOperationComplete}
          />
        </TabsContent>

        <TabsContent value="audit-trail">
          <UserAuditTrail tenantId={tenantId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
