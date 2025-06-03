
import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Edit, UserCog, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { UserWithRoles } from '@/types/user';
import { UserDirectoryTableProps } from './UserDirectoryTableProps';
import { UserForm } from '../UserForm';
import { UserRoleAssignment } from '../UserRoleAssignment';
import { format } from 'date-fns';
import { useUserManagement } from '@/hooks/user/useUserManagement';
import { useAuth } from '@/contexts/AuthContext';

export function UserDirectoryTable({
  users,
  isLoading,
  selectedUsers,
  onSelectAll,
  onSelectUser,
  sortField,
  sortDirection,
  onSort,
  currentPage,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
  totalUsers,
}: UserDirectoryTableProps) {
  const { currentTenantId } = useAuth();
  const { updateUser, deleteUser } = useUserManagement(currentTenantId || '');
  const [editingUser, setEditingUser] = useState<UserWithRoles | null>(null);
  const [managingRolesUser, setManagingRolesUser] = useState<UserWithRoles | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserWithRoles | null>(null);

  const SortButton = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      onClick={() => onSort(field)}
      className="h-auto p-0 font-medium hover:bg-transparent"
    >
      {children}
      {sortField === field && (
        sortDirection === 'asc' ? 
          <ChevronUp className="ml-1 h-4 w-4" /> : 
          <ChevronDown className="ml-1 h-4 w-4" />
      )}
    </Button>
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      active: 'default',
      inactive: 'secondary',
      pending_verification: 'destructive',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const formatLastLogin = (lastLogin: string | null) => {
    if (!lastLogin) return 'Never';
    return format(new Date(lastLogin), 'MMM dd, yyyy HH:mm');
  };

  const handleEditUser = (user: UserWithRoles) => {
    setEditingUser(user);
  };

  const handleManageRoles = (user: UserWithRoles) => {
    setManagingRolesUser(user);
  };

  const handleDeleteUser = (user: UserWithRoles) => {
    setDeletingUser(user);
  };

  const handleEditSuccess = () => {
    setEditingUser(null);
    // Refresh will be handled by the parent component
  };

  const handleRoleManagementSuccess = () => {
    setManagingRolesUser(null);
    // Refresh will be handled by the parent component
  };

  const confirmDelete = async () => {
    if (!deletingUser) return;
    
    try {
      await deleteUser(deletingUser.id);
      setDeletingUser(null);
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 animate-pulse rounded" />
        <div className="h-8 bg-gray-200 animate-pulse rounded" />
        <div className="h-8 bg-gray-200 animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedUsers.length === users.length && users.length > 0}
                  onCheckedChange={onSelectAll}
                />
              </TableHead>
              <TableHead>
                <SortButton field="first_name">Name</SortButton>
              </TableHead>
              <TableHead>
                <SortButton field="email">Email</SortButton>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead>
                <SortButton field="last_login_at">Last Login</SortButton>
              </TableHead>
              <TableHead className="w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={() => onSelectUser(user.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {`${user.first_name || ''} ${user.last_name || ''}`.trim() || 'No name'}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{getStatusBadge(user.status)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.user_roles?.map((userRole) => (
                        <Badge key={userRole.id} variant="outline">
                          {userRole.roles?.name || 'Unknown'}
                        </Badge>
                      )) || <span className="text-muted-foreground">No roles</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.tenant?.name || 'No tenant'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatLastLogin(user.last_login_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEditUser(user)}
                        title="Edit user"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleManageRoles(user)}
                        title="Manage roles"
                      >
                        <UserCog className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteUser(user)}
                        title="Delete user"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center space-x-2">
          <p className="text-sm text-muted-foreground">
            Showing {Math.min((currentPage - 1) * pageSize + 1, totalUsers)} to{' '}
            {Math.min(currentPage * pageSize, totalUsers)} of {totalUsers} results
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            Previous
          </Button>
          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
              if (page > totalPages) return null;
              return (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(page)}
                >
                  {page}
                </Button>
              );
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Edit User Modal */}
      <Modal
        open={!!editingUser}
        onOpenChange={(open) => !open && setEditingUser(null)}
        title="Edit User"
        size="lg"
      >
        {editingUser && currentTenantId && (
          <UserForm
            user={editingUser}
            tenantId={currentTenantId}
            onSuccess={handleEditSuccess}
            onCancel={() => setEditingUser(null)}
          />
        )}
      </Modal>

      {/* Manage Roles Modal */}
      <Modal
        open={!!managingRolesUser}
        onOpenChange={(open) => !open && setManagingRolesUser(null)}
        title="Manage User Roles"
        size="lg"
      >
        {managingRolesUser && currentTenantId && (
          <UserRoleAssignment
            user={managingRolesUser}
            tenantId={currentTenantId}
            onSuccess={handleRoleManagementSuccess}
            onCancel={() => setManagingRolesUser(null)}
          />
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deletingUser}
        onOpenChange={(open) => !open && setDeletingUser(null)}
        title="Delete User"
      >
        {deletingUser && (
          <div className="space-y-4">
            <p>Are you sure you want to delete user <strong>{deletingUser.email}</strong>?</p>
            <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setDeletingUser(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                Delete User
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
