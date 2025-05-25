
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { rbacService } from '@/services/rbac/rbacService';
import { Role, Permission } from '@/types/rbac';
import { Users, Shield, Plus, Trash2 } from 'lucide-react';

interface UserRole {
  userId: string;
  userEmail: string;
  roles: Role[];
}

export function RoleManagement() {
  const { user, tenantId } = useAuth();
  const { toast } = useToast();
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadUserRoles();
    loadAvailableRoles();
  }, [tenantId]);

  const loadUserRoles = async () => {
    if (!tenantId) return;
    
    setIsLoading(true);
    try {
      // Mock data for demonstration - in real app, this would fetch from API
      const mockUserRoles: UserRole[] = [
        {
          userId: 'user1',
          userEmail: 'admin@example.com',
          roles: [{ 
            id: 'admin-role', 
            name: 'Admin', 
            tenant_id: tenantId,
            description: 'Full administrative access',
            is_system_role: false,
            permissions: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]
        },
        {
          userId: 'user2',
          userEmail: 'editor@example.com',
          roles: [{ 
            id: 'editor-role', 
            name: 'Editor', 
            tenant_id: tenantId,
            description: 'Content editing permissions',
            is_system_role: false,
            permissions: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]
        }
      ];
      
      setUserRoles(mockUserRoles);
    } catch (error) {
      console.error('Failed to load user roles:', error);
      toast({
        title: 'Error',
        description: 'Failed to load user roles',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvailableRoles = async () => {
    if (!tenantId) return;

    try {
      // Mock data for demonstration
      const mockRoles: Role[] = [
        { 
          id: 'admin-role', 
          name: 'Admin', 
          tenant_id: tenantId,
          description: 'Full administrative access',
          is_system_role: false,
          permissions: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        { 
          id: 'editor-role', 
          name: 'Editor', 
          tenant_id: tenantId,
          description: 'Content editing permissions',
          is_system_role: false,
          permissions: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        { 
          id: 'viewer-role', 
          name: 'Viewer', 
          tenant_id: tenantId,
          description: 'Read-only access',
          is_system_role: false,
          permissions: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      
      setAvailableRoles(mockRoles);
    } catch (error) {
      console.error('Failed to load available roles:', error);
    }
  };

  const handleAssignRole = async () => {
    if (!selectedUser || !selectedRole || !user || !tenantId) return;

    setIsLoading(true);
    try {
      const result = await rbacService.assignRole(user.id, selectedUser, selectedRole, tenantId);
      
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Role assigned successfully'
        });
        await loadUserRoles();
        setSelectedUser('');
        setSelectedRole('');
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to assign role',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Failed to assign role:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign role',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveRole = async (userId: string, roleId: string) => {
    if (!user || !tenantId) return;

    setIsLoading(true);
    try {
      // In real implementation, this would call rbacService.removeRole
      toast({
        title: 'Success',
        description: 'Role removed successfully'
      });
      await loadUserRoles();
    } catch (error) {
      console.error('Failed to remove role:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove role',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Role Management
          </CardTitle>
          <CardDescription>
            Manage user roles and permissions within your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium">User</label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {userRoles.map(userRole => (
                      <SelectItem key={userRole.userId} value={userRole.userId}>
                        {userRole.userEmail}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex-1">
                <label className="text-sm font-medium">Role</label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map(role => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                onClick={handleAssignRole}
                disabled={!selectedUser || !selectedRole || isLoading}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Assign Role
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Current User Roles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userRoles.map(userRole => (
                <TableRow key={userRole.userId}>
                  <TableCell>{userRole.userEmail}</TableCell>
                  <TableCell>
                    <div className="flex gap-2 flex-wrap">
                      {userRole.roles.map(role => (
                        <Badge key={role.id} variant="secondary">
                          {role.name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {userRole.roles.map(role => (
                        <Button
                          key={role.id}
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveRole(userRole.userId, role.id)}
                          disabled={isLoading}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {userRoles.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No user roles found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
