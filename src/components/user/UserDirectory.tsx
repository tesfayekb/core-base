
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserDirectorySearch } from './directory/UserDirectorySearch';
import { UserDirectoryFilters } from './directory/UserDirectoryFilters';
import { UserDirectoryTable } from './directory/UserDirectoryTable';
import { UserDirectoryBulkActions } from './directory/UserDirectoryBulkActions';
import { useUserManagement } from '@/hooks/user/useUserManagement';
import { useAuth } from '@/contexts/AuthContext';
import { Users, Filter, Download } from 'lucide-react';

export function UserDirectory() {
  const { user, currentTenantId } = useAuth();
  const { users, isLoading, error } = useUserManagement(currentTenantId || '');
  
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
  
  // Filter and sort users
  const filteredAndSortedUsers = useMemo(() => {
    if (!users || !Array.isArray(users)) return [];
    
    let filtered = users.filter(user => {
      const matchesSearch = searchQuery === '' || 
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
      
      // Role filtering would need role data - simplified for now
      const matchesRole = roleFilter === 'all';
      
      return matchesSearch && matchesStatus && matchesRole;
    });
    
    // Sort users
    filtered.sort((a, b) => {
      let aValue = a[sortField as keyof typeof a];
      let bValue = b[sortField as keyof typeof b];
      
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    return filtered;
  }, [users, searchQuery, statusFilter, roleFilter, sortField, sortDirection]);
  
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
            
            <UserDirectoryFilters
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              roleFilter={roleFilter}
              onRoleFilterChange={setRoleFilter}
            />
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
