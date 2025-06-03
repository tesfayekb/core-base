
import React, { useState, useMemo, useEffect } from 'react';
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
import { supabase } from '@/integrations/supabase/client';
import { Users, Filter, Download, Plus } from 'lucide-react';
import { UserWithRoles } from '@/types/user';

interface Tenant {
  id: string;
  name: string;
  slug: string;
}

export function EnhancedUserDirectory() {
  const { user, currentTenantId } = useAuth();
  const { users, isLoading, error } = useUserManagement(); // SuperAdmin gets all users
  
  // State for search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [tenantFilter, setTenantFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Tenant list for filtering
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoadingTenants, setIsLoadingTenants] = useState(false);

  // Fetch tenants for filtering
  useEffect(() => {
    const fetchTenants = async () => {
      setIsLoadingTenants(true);
      try {
        const { data, error } = await supabase
          .from('tenants')
          .select('id, name, slug')
          .order('name');
        
        if (error) {
          console.error('Error fetching tenants:', error);
        } else {
          setTenants(data || []);
        }
      } catch (err) {
        console.error('Error fetching tenants:', err);
      } finally {
        setIsLoadingTenants(false);
      }
    };

    fetchTenants();
  }, []);
  
  // Filter and sort users
  const filteredAndSortedUsers = useMemo(() => {
    if (!users || !Array.isArray(users)) return [];
    
    let filtered = users.filter((user: UserWithRoles) => {
      const matchesSearch = searchQuery === '' || 
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
      
      // Tenant filtering
      const matchesTenant = tenantFilter === 'all' || 
        (tenantFilter === 'no-tenant' && !user.tenant_id) ||
        user.tenant_id === tenantFilter;
      
      // Role filtering using actual role data
      const matchesRole = roleFilter === 'all' || (
        user.user_roles && user.user_roles.some(userRole => 
          userRole.role && userRole.role.name.toLowerCase() === roleFilter.toLowerCase()
        )
      );
      
      return matchesSearch && matchesStatus && matchesTenant && matchesRole;
    });
    
    // Sort users
    filtered.sort((a, b) => {
      let aValue: any = a[sortField as keyof UserWithRoles];
      let bValue: any = b[sortField as keyof UserWithRoles];
      
      // Handle null/undefined values
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
  }, [users, searchQuery, statusFilter, roleFilter, tenantFilter, sortField, sortDirection]);
  
  // Paginate users
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedUsers.slice(start, start + pageSize);
  }, [filteredAndSortedUsers, currentPage, pageSize]);
  
  const totalPages = Math.ceil(filteredAndSortedUsers.length / pageSize);
  
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
  
  if (error) {
    console.error('User directory error:', error);
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Error Loading Users</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Failed to load user directory. Please try refreshing the page.</p>
          <div className="mt-4 p-4 bg-gray-50 rounded">
            <p className="text-sm text-gray-600 mb-2">Debug Information:</p>
            <p className="text-xs font-mono">{currentTenantId ? `Tenant: ${currentTenantId}` : 'No tenant ID'}</p>
            <p className="text-xs font-mono">{user ? `User: ${user.email}` : 'No user'}</p>
            <p className="text-xs font-mono text-red-600">Error: {error?.message || 'Unknown error'}</p>
          </div>
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
            User Directory
          </h2>
          <p className="text-muted-foreground">
            Manage and monitor user accounts across your organization
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {filteredAndSortedUsers.length} users
          </Badge>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>
      
      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <UserDirectorySearch 
              value={searchQuery}
              onChange={setSearchQuery}
            />
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filters</span>
              </div>
              
              <div className="flex items-center gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending_verification">Pending</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={tenantFilter} onValueChange={setTenantFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder={isLoadingTenants ? "Loading..." : "Tenant"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tenants</SelectItem>
                    <SelectItem value="no-tenant">No Tenant</SelectItem>
                    {tenants.map((tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <UserDirectoryFilters
                  statusFilter={statusFilter}
                  onStatusFilterChange={setStatusFilter}
                  roleFilter={roleFilter}
                  onRoleFilterChange={setRoleFilter}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
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
        onSelectAll={handleSelectAll}
        onSelectUser={handleSelectUser}
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
      />
    </div>
  );
}
