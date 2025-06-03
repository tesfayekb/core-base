
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserDirectorySearch } from './directory/UserDirectorySearch';
import { UserDirectoryFilters } from './directory/UserDirectoryFilters';
import { UserDirectoryTable } from './directory/UserDirectoryTable';
import { UserDirectoryBulkActions } from './directory/UserDirectoryBulkActions';
import { useUserManagement } from '@/hooks/user/useUserManagement';
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import { Users, Filter, Download, Globe, Building, User } from 'lucide-react';

type DirectoryScope = 'system' | 'tenant' | 'personal';

export function EnhancedUserDirectory() {
  const { user, currentTenantId } = useAuth();
  const [directoryScope, setDirectoryScope] = useState<DirectoryScope>('tenant');
  const [selectedTenant, setSelectedTenant] = useState<string>(currentTenantId || '');
  
  // Permission checks for different scopes
  const { hasPermission: canViewAllUsers } = usePermission('ViewAny', 'users');
  const { hasPermission: canViewTenantUsers } = usePermission('Read', 'users');
  const { hasPermission: canManageUsers } = usePermission('Manage', 'users');
  
  // Determine effective tenant ID based on scope
  const effectiveTenantId = useMemo(() => {
    switch (directoryScope) {
      case 'system':
        return null; // System-wide view
      case 'tenant':
        return selectedTenant || currentTenantId;
      case 'personal':
        return currentTenantId;
      default:
        return currentTenantId;
    }
  }, [directoryScope, selectedTenant, currentTenantId]);

  const { users, isLoading, error } = useUserManagement(effectiveTenantId || '');
  
  // State for search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter users based on scope and permissions
  const filteredAndSortedUsers = useMemo(() => {
    if (!users || !Array.isArray(users)) return [];
    
    let filtered = users.filter(userItem => {
      // Scope-based filtering
      switch (directoryScope) {
        case 'system':
          // SuperAdmin can see all users across all tenants
          if (!canViewAllUsers) return false;
          break;
        case 'tenant':
          // Users in current tenant context
          if (!canViewTenantUsers) return false;
          break;
        case 'personal':
          // Only current user's data
          if (userItem.id !== user?.id) return false;
          break;
      }

      // Search filtering
      const matchesSearch = searchQuery === '' || 
        userItem.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `${userItem.first_name || ''} ${userItem.last_name || ''}`.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Status filtering
      const matchesStatus = statusFilter === 'all' || userItem.status === statusFilter;
      
      // Role filtering
      const matchesRole = roleFilter === 'all' || (
        userItem.user_roles && userItem.user_roles.some(userRole => 
          userRole.role.name.toLowerCase() === roleFilter.toLowerCase()
        )
      );
      
      return matchesSearch && matchesStatus && matchesRole;
    });
    
    // Sort users
    filtered.sort((a, b) => {
      let aValue: any = a[sortField as keyof typeof a];
      let bValue: any = b[sortField as keyof typeof b];
      
      if (!aValue && !bValue) return 0;
      if (!aValue) return sortDirection === 'asc' ? 1 : -1;
      if (!bValue) return sortDirection === 'asc' ? -1 : 1;
      
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    return filtered;
  }, [users, directoryScope, canViewAllUsers, canViewTenantUsers, user?.id, searchQuery, statusFilter, roleFilter, sortField, sortDirection]);
  
  // Paginate users
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedUsers.slice(start, start + pageSize);
  }, [filteredAndSortedUsers, currentPage, pageSize]);
  
  const totalPages = Math.ceil(filteredAndSortedUsers.length / pageSize);

  // Scope options based on permissions
  const availableScopes = useMemo(() => {
    const scopes = [];
    
    if (canViewAllUsers) {
      scopes.push({ value: 'system', label: 'System-wide', icon: Globe });
    }
    
    if (canViewTenantUsers) {
      scopes.push({ value: 'tenant', label: 'Current Tenant', icon: Building });
    }
    
    scopes.push({ value: 'personal', label: 'Personal', icon: User });
    
    return scopes;
  }, [canViewAllUsers, canViewTenantUsers]);

  // Bulk selection handlers
  const handleSelectAll = () => {
    if (selectedUsers.length === paginatedUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(paginatedUsers.map(user => user.id));
    }
  };
  
  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const getScopeIcon = (scope: DirectoryScope) => {
    switch (scope) {
      case 'system': return Globe;
      case 'tenant': return Building;
      case 'personal': return User;
      default: return Users;
    }
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Error Loading Users</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Failed to load user directory: {String(error)}</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header with Scope Selection */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6" />
            User Directory
          </h2>
          <p className="text-muted-foreground">
            Manage and monitor user accounts based on your access level
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Scope Selection */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">View:</label>
            <Select value={directoryScope} onValueChange={(value: DirectoryScope) => setDirectoryScope(value)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableScopes.map(scope => {
                  const Icon = scope.icon;
                  return (
                    <SelectItem key={scope.value} value={scope.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {scope.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <Badge variant="secondary">
            {filteredAndSortedUsers.length} users
          </Badge>
          
          {canManageUsers && (
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Scope Information */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {React.createElement(getScopeIcon(directoryScope), { className: "h-5 w-5 text-muted-foreground" })}
            <div>
              <p className="font-medium">
                {directoryScope === 'system' && 'System-wide User Directory'}
                {directoryScope === 'tenant' && `Tenant User Directory${selectedTenant ? ` (${selectedTenant})` : ''}`}
                {directoryScope === 'personal' && 'Personal User Profile'}
              </p>
              <p className="text-sm text-muted-foreground">
                {directoryScope === 'system' && 'Viewing all users across all tenants (SuperAdmin access)'}
                {directoryScope === 'tenant' && 'Viewing users within the current tenant context'}
                {directoryScope === 'personal' && 'Viewing only your personal user information'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Search and Filters - Only show for system and tenant views */}
      {directoryScope !== 'personal' && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <UserDirectorySearch 
                value={searchQuery}
                onChange={setSearchQuery}
              />
              
              <UserDirectoryFilters
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                roleFilter={roleFilter}
                onRoleFilterChange={setRoleFilter}
              />
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Bulk Actions - Only show if users are selected and user has management permissions */}
      {selectedUsers.length > 0 && canManageUsers && directoryScope !== 'personal' && (
        <UserDirectoryBulkActions
          selectedCount={selectedUsers.length}
          onClearSelection={() => setSelectedUsers([])}
        />
      )}
      
      {/* User Table */}
      <UserDirectoryTable
        users={paginatedUsers}
        isLoading={isLoading}
        selectedUsers={selectedUsers}
        onSelectAll={directoryScope !== 'personal' ? handleSelectAll : undefined}
        onSelectUser={directoryScope !== 'personal' ? handleSelectUser : undefined}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={(field) => {
          if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
          } else {
            setSortField(field);
            setSortDirection('asc');
          }
        }}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        totalUsers={filteredAndSortedUsers.length}
        canManage={canManageUsers && directoryScope !== 'personal'}
        scope={directoryScope}
      />
    </div>
  );
}
