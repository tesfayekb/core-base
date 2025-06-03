
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useUserManagement } from '@/hooks/user/useUserManagement';
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import { Users, Filter, Search, Eye, Edit, Trash2 } from 'lucide-react';
import { UserWithRoles } from '@/services/user/UserManagementService';

export function EnhancedUserDirectory() {
  const { user, currentTenantId } = useAuth();
  const { users, isLoading, error } = useUserManagement();
  
  // Permission checks
  const { hasPermission: canViewAllUsers } = usePermission('manage', 'all');
  const { hasPermission: canManageUsers } = usePermission('manage', 'users');
  const { hasPermission: canViewUsers } = usePermission('read', 'users');
  
  // State for filters and search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tenantFilter, setTenantFilter] = useState<string>('all');
  const [scopeFilter, setScopeFilter] = useState<string>('current-tenant');
  
  // Filter users based on permissions and filters
  const filteredUsers = useMemo(() => {
    if (!users || !Array.isArray(users)) return [];
    
    let filtered = users;
    
    // Apply permission-based filtering
    if (!canViewAllUsers) {
      // If user can't view all users, only show users from their tenant
      filtered = filtered.filter(u => u.tenant_id === currentTenantId);
    }
    
    // Apply scope filter
    if (scopeFilter === 'current-tenant' && currentTenantId) {
      filtered = filtered.filter(u => u.tenant_id === currentTenantId);
    } else if (scopeFilter === 'all-tenants' && !canViewAllUsers) {
      // If user doesn't have permission to view all, fall back to current tenant
      filtered = filtered.filter(u => u.tenant_id === currentTenantId);
    }
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(u => 
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(u => u.status === statusFilter);
    }
    
    // Apply tenant filter
    if (tenantFilter !== 'all') {
      filtered = filtered.filter(u => u.tenant_id === tenantFilter);
    }
    
    return filtered;
  }, [users, searchQuery, statusFilter, tenantFilter, scopeFilter, canViewAllUsers, currentTenantId]);
  
  // Get unique tenants for filter
  const uniqueTenants = useMemo(() => {
    if (!users) return [];
    const tenants = [...new Set(users.map(u => u.tenant_id))];
    return tenants;
  }, [users]);
  
  const renderUserRow = (user: UserWithRoles) => (
    <TableRow key={user.id}>
      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium">{user.email}</span>
          <span className="text-sm text-muted-foreground">
            {user.first_name} {user.last_name}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
          {user.status}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {user.user_roles?.map((userRole, idx) => (
            <Badge key={idx} variant="outline">
              {userRole.role.name}
            </Badge>
          )) || <span className="text-muted-foreground">No roles</span>}
        </div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {user.tenant_id}
      </TableCell>
      <TableCell>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4" />
          </Button>
          {canManageUsers && (
            <>
              <Button variant="ghost" size="sm">
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
  
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Error Loading Users</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Failed to load users: {error}</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6" />
            Enhanced User Directory
          </h2>
          <p className="text-muted-foreground">
            {canViewAllUsers ? 'System-wide user management' : 'Tenant user management'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {filteredUsers.length} users
          </Badge>
          {canViewAllUsers && (
            <Badge variant="outline">
              SuperAdmin View
            </Badge>
          )}
        </div>
      </div>
      
      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Scope Filter - only show if user has permission */}
            {canViewAllUsers && (
              <Select value={scopeFilter} onValueChange={setScopeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current-tenant">Current Tenant</SelectItem>
                  <SelectItem value="all-tenants">All Tenants</SelectItem>
                </SelectContent>
              </Select>
            )}
            
            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending_verification">Pending</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Tenant Filter - only show if viewing all tenants */}
            {canViewAllUsers && scopeFilter === 'all-tenants' && (
              <Select value={tenantFilter} onValueChange={setTenantFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tenant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tenants</SelectItem>
                  {uniqueTenants.map(tenantId => (
                    <SelectItem key={tenantId} value={tenantId}>
                      {tenantId.slice(0, 8)}...
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {/* Clear Filters */}
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setTenantFilter('all');
                setScopeFilter('current-tenant');
              }}
            >
              <Filter className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* User Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="inline-flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                Loading users...
              </div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {users.length === 0 ? 'No users found in the system.' : 'No users match your filters.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map(renderUserRow)}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {/* Debug Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Debug Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Total Users:</strong> {users?.length || 0}
            </div>
            <div>
              <strong>Filtered Users:</strong> {filteredUsers.length}
            </div>
            <div>
              <strong>Current Tenant:</strong> {currentTenantId}
            </div>
            <div>
              <strong>Can View All:</strong> {canViewAllUsers ? 'Yes' : 'No'}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
