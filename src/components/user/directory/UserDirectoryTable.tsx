
import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserWithRoles } from '@/services/user/UserManagementService';
import { MoreHorizontal, Edit, Trash2, UserCog } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface UserDirectoryTableProps {
  users: UserWithRoles[];
  onEditUser?: (user: UserWithRoles) => void;
  onDeleteUser?: (userId: string) => void;
  onManageRoles?: (user: UserWithRoles) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  canManageRoles?: boolean;
}

export function UserDirectoryTable({
  users,
  onEditUser,
  onDeleteUser,
  onManageRoles,
  canEdit = false,
  canDelete = false,
  canManageRoles = false,
}: UserDirectoryTableProps) {
  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'default';
      case 'inactive':
        return 'secondary';
      case 'suspended':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Roles</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                No users found
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  {user.first_name && user.last_name 
                    ? `${user.first_name} ${user.last_name}` 
                    : 'N/A'
                  }
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(user.status)}>
                    {user.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {user.roles && user.roles.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (
                        <Badge key={role.id} variant="outline" className="text-xs">
                          {role.name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">No roles</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {(canEdit || canDelete || canManageRoles) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {canEdit && onEditUser && (
                          <DropdownMenuItem onClick={() => onEditUser(user)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit User
                          </DropdownMenuItem>
                        )}
                        {canManageRoles && onManageRoles && (
                          <DropdownMenuItem onClick={() => onManageRoles(user)}>
                            <UserCog className="mr-2 h-4 w-4" />
                            Manage Roles
                          </DropdownMenuItem>
                        )}
                        {canDelete && onDeleteUser && (
                          <DropdownMenuItem 
                            onClick={() => onDeleteUser(user.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete User
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
