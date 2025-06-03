
import React, { useState, useMemo } from 'react';
import { Modal } from "@/components/ui/modal";
import { UserDirectoryHeader } from './directory/UserDirectoryHeader';
import { UserDirectorySearchFilters } from './directory/UserDirectorySearchFilters';
import { UserDirectoryTable } from './directory/UserDirectoryTable';
import { UserDirectoryBulkActions } from './directory/UserDirectoryBulkActions';
import { UserForm } from './UserForm';
import { useUserManagement } from '@/hooks/user/useUserManagement';
import { useAuth } from '@/contexts/AuthContext';

export function UserDirectory() {
  const { user, currentTenantId } = useAuth();
  const { users, isLoading, error, refetch } = useUserManagement(currentTenantId || '');
  
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

  // Add user modal state
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  
  // Force refresh data when component mounts or when user logs in
  React.useEffect(() => {
    if (user) {
      refetch();
    }
  }, [user, refetch]);
  
  // Filter and sort users
  const filteredAndSortedUsers = useMemo(() => {
    if (!users || !Array.isArray(users)) return [];
    
    let filtered = users.filter(user => {
      const matchesSearch = searchQuery === '' || 
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
      
      // Role filtering using actual role data
      const matchesRole = roleFilter === 'all' || (
        user.user_roles && user.user_roles.some(userRole => 
          userRole?.roles?.name?.toLowerCase() === roleFilter.toLowerCase()
        )
      );
      
      // Tenant filtering
      const matchesTenant = tenantFilter === 'all' || 
        (tenantFilter === 'no-tenant' && !user.tenant_id) ||
        user.tenant_id === tenantFilter;
      
      return matchesSearch && matchesStatus && matchesRole && matchesTenant;
    });
    
    // Sort users
    filtered.sort((a, b) => {
      let aValue: any = a[sortField as keyof typeof a];
      let bValue: any = b[sortField as keyof typeof b];
      
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

  const handleAddUserSuccess = () => {
    setShowAddUserModal(false);
    refetch();
  };

  const handleExport = () => {
    // Export functionality to be implemented
    console.log('Export users functionality');
  };
  
  if (error) {
    return (
      <div className="space-y-6">
        <UserDirectoryHeader 
          userCount={0}
          onExport={handleExport}
          onAddUser={() => setShowAddUserModal(true)}
        />
        <div className="text-center py-12">
          <p className="text-red-600">Failed to load user directory: {String(error)}</p>
          <button 
            onClick={() => refetch()} 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <UserDirectoryHeader 
        userCount={filteredAndSortedUsers.length}
        onExport={handleExport}
        onAddUser={() => setShowAddUserModal(true)}
      />
      
      {/* Search and Filters */}
      <UserDirectorySearchFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        tenantFilter={tenantFilter}
        onTenantFilterChange={setTenantFilter}
      />
      
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

      {/* Add User Modal */}
      <Modal
        open={showAddUserModal}
        onOpenChange={setShowAddUserModal}
        title="Add New User"
        size="lg"
      >
        {currentTenantId && (
          <UserForm
            tenantId={currentTenantId}
            onSuccess={handleAddUserSuccess}
            onCancel={() => setShowAddUserModal(false)}
          />
        )}
      </Modal>
    </div>
  );
}
