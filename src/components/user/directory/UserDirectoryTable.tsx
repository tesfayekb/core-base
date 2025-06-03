
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  ChevronUp, 
  ChevronDown, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Key,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { User } from '@/hooks/user/useUserManagement';

interface UserDirectoryTableProps {
  users: User[];
  isLoading: boolean;
  selectedUsers: string[];
  onSelectAll?: () => void;
  onSelectUser?: (userId: string) => void;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  onSort: (field: string) => void;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  totalUsers: number;
  canManage?: boolean;
  scope?: 'system' | 'tenant' | 'personal';
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
  totalUsers,
  canManage = false,
  scope = 'tenant'
}: UserDirectoryTableProps) {
  
  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? 
      <ChevronUp className="h-4 w-4 ml-1" /> : 
      <ChevronDown className="h-4 w-4 ml-1" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'suspended':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending_verification':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getUserInitials = (user: User) => {
    const first = user.first_name?.charAt(0) || '';
    const last = user.last_name?.charAt(0) || '';
    return first + last || user.email.charAt(0).toUpperCase();
  };

  const getUserDisplayName = (user: User) => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    return user.email;
  };

  if (isLoading) {
    return (
      <div className="border rounded-lg p-8">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {/* Selection checkbox - only show if not personal scope */}
              {scope !== 'personal' && onSelectAll && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedUsers.length === users.length && users.length > 0}
                    onCheckedChange={onSelectAll}
                  />
                </TableHead>
              )}
              
              {/* User column */}
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onSort('email')}
              >
                <div className="flex items-center">
                  User
                  <SortIcon field="email" />
                </div>
              </TableHead>
              
              {/* Status column */}
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onSort('status')}
              >
                <div className="flex items-center">
                  Status
                  <SortIcon field="status" />
                </div>
              </TableHead>
              
              {/* Roles column */}
              <TableHead>Roles</TableHead>
              
              {/* Last Login column */}
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onSort('last_login_at')}
              >
                <div className="flex items-center">
                  Last Login
                  <SortIcon field="last_login_at" />
                </div>
              </TableHead>
              
              {/* Created column */}
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onSort('created_at')}
              >
                <div className="flex items-center">
                  Created
                  <SortIcon field="created_at" />
                </div>
              </TableHead>

              {/* Actions column - only show if user can manage and not personal scope */}
              {canManage && scope !== 'personal' && (
                <TableHead className="w-12">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell 
                  colSpan={scope === 'personal' ? 5 : (canManage ? 7 : 6)} 
                  className="text-center py-8"
                >
                  <div className="text-muted-foreground">
                    {scope === 'personal' ? 'No personal data available' : 'No users found'}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  {/* Selection checkbox */}
                  {scope !== 'personal' && onSelectUser && (
                    <TableCell>
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={() => onSelectUser(user.id)}
                      />
                    </TableCell>
                  )}
                  
                  {/* User info */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src="" />
                        <AvatarFallback className="text-xs">
                          {getUserInitials(user)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{getUserDisplayName(user)}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  
                  {/* Status */}
                  <TableCell>
                    <Badge className={getStatusColor(user.status || 'inactive')}>
                      {user.status || 'inactive'}
                    </Badge>
                  </TableCell>
                  
                  {/* Roles */}
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.user_roles && user.user_roles.length > 0 ? (
                        user.user_roles.map((userRole) => (
                          <Badge key={userRole.id} variant="outline" className="text-xs">
                            {userRole.role.name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">No roles</span>
                      )}
                    </div>
                  </TableCell>
                  
                  {/* Last Login */}
                  <TableCell>
                    <div className="text-sm">
                      {user.last_login_at ? formatDate(user.last_login_at) : 'Never'}
                    </div>
                  </TableCell>
                  
                  {/* Created */}
                  <TableCell>
                    <div className="text-sm">
                      {user.created_at ? formatDate(user.created_at) : 'Unknown'}
                    </div>
                  </TableCell>

                  {/* Actions */}
                  {canManage && scope !== 'personal' && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit User
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Key className="mr-2 h-4 w-4" />
                            Manage Roles
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination - only show if more than one page and not personal scope */}
      {totalPages > 1 && scope !== 'personal' && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {Math.min((currentPage - 1) * pageSize + 1, totalUsers)} to{' '}
            {Math.min(currentPage * pageSize, totalUsers)} of {totalUsers} users
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNumber = i + Math.max(1, currentPage - 2);
                if (pageNumber > totalPages) return null;
                
                return (
                  <Button
                    key={pageNumber}
                    variant={pageNumber === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange(pageNumber)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNumber}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
