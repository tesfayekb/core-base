
import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Modal } from "@/components/ui/modal";
import { UserForm } from "@/components/user/UserForm";
import { useAuth } from '@/contexts/AuthContext';
import { UserWithRoles } from '@/types/user';
import { MoreHorizontal, ChevronLeft, ChevronRight, Edit, Trash2, Settings } from 'lucide-react';

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
  onPageSizeChange,
  onPageChange,
  totalUsers
}: UserDirectoryTableProps) {
  const { currentTenantId } = useAuth();
  const [editingUser, setEditingUser] = useState<UserWithRoles | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUserRoles = (user: UserWithRoles) => {
    if (!user.user_roles || user.user_roles.length === 0) {
      return 'No roles';
    }
    return user.user_roles.map(ur => ur.role?.name || ur.roles?.name).filter(Boolean).join(', ');
  };

  const handleEditUser = (user: UserWithRoles) => {
    setEditingUser(user);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setEditingUser(null);
    setShowEditModal(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">Loading users...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedUsers.length === users.length && users.length > 0}
                    onCheckedChange={onSelectAll}
                  />
                </TableHead>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => onSort('email')}
                >
                  User
                </TableHead>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => onSort('status')}
                >
                  Status
                </TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => onSort('last_login_at')}
                >
                  Last Login
                </TableHead>
                <TableHead className="w-12"></TableHead>
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
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {user.first_name && user.last_name 
                          ? `${user.first_name} ${user.last_name}` 
                          : user.email
                        }
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {user.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={user.status === 'active' ? 'default' : 'secondary'}
                    >
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {user.tenant_id === currentTenantId ? 'Current Tenant' : 'Other Tenant'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {getUserRoles(user)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {formatDate(user.last_login_at)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditUser(user)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit User
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Settings className="h-4 w-4 mr-2" />
                          Manage Roles
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalUsers)} of {totalUsers} users</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              
              <div className="flex items-center gap-1 ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <span className="text-sm px-3">
                  Page {currentPage} of {totalPages}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit User Modal */}
      <Modal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        title="Edit User"
        size="lg"
      >
        {editingUser && currentTenantId && (
          <UserForm
            user={editingUser}
            tenantId={currentTenantId}
            onSuccess={handleCloseEditModal}
            onCancel={handleCloseEditModal}
          />
        )}
      </Modal>
    </>
  );
}
