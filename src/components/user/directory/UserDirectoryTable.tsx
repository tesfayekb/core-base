
import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Modal } from "@/components/ui/modal";
import { Edit, Shield, ChevronUp, ChevronDown } from 'lucide-react';
import { UserForm } from '../UserForm';
import { UserRoleAssignment } from '../UserRoleAssignment';
import { UserWithRoles } from '@/types/user';
import { useAuth } from '@/contexts/AuthContext';

interface UserDirectoryTableProps {
  users: UserWithRoles[];
  isLoading: boolean;
  selectedUsers: string[];
  onSelectAll: () => void;
  onSelectUser: (userId: string) => void;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  onSort: (field: string) => void;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  totalUsers: number;
}

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
  totalUsers
}: UserDirectoryTableProps) {
  const { currentTenantId } = useAuth();
  const [editingUser, setEditingUser] = useState<UserWithRoles | null>(null);
  const [roleManagementUser, setRoleManagementUser] = useState<UserWithRoles | null>(null);

  const handleEditUser = (user: UserWithRoles) => {
    setEditingUser(user);
  };

  const handleManageRoles = (user: UserWithRoles) => {
    setRoleManagementUser(user);
  };

  const handleEditSuccess = () => {
    setEditingUser(null);
    // Trigger a refetch by calling parent component's refetch
    window.location.reload();
  };

  const handleRoleSuccess = () => {
    setRoleManagementUser(null);
    // Trigger a refetch by calling parent component's refetch
    window.location.reload();
  };

  const SortableHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <TableHead 
      className="cursor-pointer hover:bg-muted/50" 
      onClick={() => onSort(field)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        {sortField === field && (
          sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
        )}
      </div>
    </TableHead>
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Loading skeleton */}
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  return (
    <>
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
              <SortableHeader field="email">Email</SortableHeader>
              <SortableHeader field="first_name">Name</SortableHeader>
              <SortableHeader field="status">Status</SortableHeader>
              <TableHead>Roles</TableHead>
              <SortableHeader field="last_login_at">Last Login</SortableHeader>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedUsers.includes(user.id)}
                    onCheckedChange={() => onSelectUser(user.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">{user.email}</TableCell>
                <TableCell>
                  {[user.first_name, user.last_name].filter(Boolean).join(' ') || '-'}
                </TableCell>
                <TableCell>
                  <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                    {user.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {user.user_roles?.map((userRole) => (
                      <Badge key={userRole.id} variant="outline" className="text-xs">
                        {userRole.roles?.name || 'Unknown'}
                      </Badge>
                    )) || <span className="text-muted-foreground">No roles</span>}
                  </div>
                </TableCell>
                <TableCell>
                  {user.last_login_at 
                    ? new Date(user.last_login_at).toLocaleDateString()
                    : 'Never'
                  }
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditUser(user)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleManageRoles(user)}
                    >
                      <Shield className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center space-x-2">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalUsers)} of {totalUsers} users
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
          >
            Previous
          </Button>
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
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

      {/* Role Management Modal */}
      <Modal
        open={!!roleManagementUser}
        onOpenChange={(open) => !open && setRoleManagementUser(null)}
        title="Manage User Roles"
        size="md"
      >
        {roleManagementUser && currentTenantId && (
          <UserRoleAssignment
            user={roleManagementUser}
            tenantId={currentTenantId}
            onSuccess={handleRoleSuccess}
          />
        )}
      </Modal>
    </>
  );
}
