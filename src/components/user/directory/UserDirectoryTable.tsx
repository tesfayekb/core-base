
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { MoreHorizontal, ChevronUp, ChevronDown } from 'lucide-react';
import { User } from '@/hooks/user/useUserManagement';

interface UserDirectoryTableProps {
  users: User[];
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
  const getSortIcon = (field: string) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'suspended': return 'destructive';
      case 'pending_verification': return 'outline';
      default: return 'secondary';
    }
  };

  const formatDisplayName = (user: User) => {
    // Display first name and last name together
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    // Fallback to email username if no names are provided
    return user.email.split('@')[0];
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
              onClick={() => onSort('first_name')}
            >
              <div className="flex items-center gap-2">
                Name
                {getSortIcon('first_name')}
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer"
              onClick={() => onSort('email')}
            >
              <div className="flex items-center gap-2">
                Email
                {getSortIcon('email')}
              </div>
            </TableHead>
            <TableHead>Roles</TableHead>
            <TableHead 
              className="cursor-pointer"
              onClick={() => onSort('status')}
            >
              <div className="flex items-center gap-2">
                Status
                {getSortIcon('status')}
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer"
              onClick={() => onSort('created_at')}
            >
              <div className="flex items-center gap-2">
                Joined
                {getSortIcon('created_at')}
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer"
              onClick={() => onSort('last_login_at')}
            >
              <div className="flex items-center gap-2">
                Last Login
                {getSortIcon('last_login_at')}
              </div>
            </TableHead>
            <TableHead className="w-12">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                No users found
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
                <TableCell>
                  <div className="font-medium">{formatDisplayName(user)}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-muted-foreground">{user.email}</div>
                </TableCell>
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
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(user.status || 'pending_verification')}>
                    {(user.status || 'pending_verification').replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm">{formatDate(user.created_at)}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">{formatDate(user.last_login_at)}</div>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalUsers)} of {totalUsers} users
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = i + 1;
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
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
