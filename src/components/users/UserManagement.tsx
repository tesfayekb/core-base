
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SecureForm } from '@/components/security/SecureForm';
import { SecureInput } from '@/components/security/SecureInput';
import { useAuth } from '@/contexts/AuthContext';
import { auditLoggingService } from '@/services/audit/AuditLoggingService';
import { useToast } from '@/hooks/use-toast';
import { Users, Plus, Edit, Trash2 } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  last_login?: string;
}

const userValidationSchema = {
  email: {
    type: 'email' as const,
    required: true,
    maxLength: 254
  },
  name: {
    type: 'text' as const,
    required: true,
    minLength: 2,
    maxLength: 100
  },
  role: {
    type: 'text' as const,
    required: true,
    pattern: /^(SuperAdmin|BasicUser)$/
  }
};

export function UserManagement() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      // Mock data for demonstration - in real app, this would be an API call
      const mockUsers: User[] = [
        {
          id: '1',
          email: 'admin@example.com',
          name: 'System Administrator',
          role: 'SuperAdmin',
          status: 'active',
          created_at: '2024-01-01T00:00:00Z',
          last_login: '2024-01-15T10:30:00Z'
        },
        {
          id: '2', 
          email: 'user@example.com',
          name: 'Regular User',
          role: 'BasicUser',
          status: 'active',
          created_at: '2024-01-02T00:00:00Z',
          last_login: '2024-01-14T15:45:00Z'
        }
      ];
      
      setUsers(mockUsers);
      
      if (currentUser) {
        await auditLoggingService.logUserEvent(
          'list_users',
          'system',
          currentUser.id,
          { count: mockUsers.length }
        );
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUser = async (sanitizedData: Record<string, any>) => {
    try {
      const newUser: User = {
        id: `user_${Date.now()}`,
        email: sanitizedData.email,
        name: sanitizedData.name,
        role: sanitizedData.role,
        status: 'active',
        created_at: new Date().toISOString()
      };

      setUsers(prev => [...prev, newUser]);
      setShowAddForm(false);

      if (currentUser) {
        await auditLoggingService.logUserEvent(
          'create_user',
          newUser.id,
          currentUser.id,
          { 
            email: sanitizedData.email,
            role: sanitizedData.role
          }
        );
      }

      toast({
        title: "Success",
        description: "User created successfully"
      });
    } catch (error) {
      console.error('Failed to create user:', error);
      throw error;
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      setUsers(prev => prev.filter(u => u.id !== userId));

      if (currentUser) {
        await auditLoggingService.logUserEvent(
          'delete_user',
          userId,
          currentUser.id
        );
      }

      toast({
        title: "Success",
        description: "User deleted successfully"
      });
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive"
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'suspended': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription>
                Manage user accounts, roles, and permissions
              </CardDescription>
            </div>
            <Button 
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showAddForm && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Add New User</CardTitle>
              </CardHeader>
              <CardContent>
                <SecureForm
                  onSubmit={handleAddUser}
                  validationSchema={userValidationSchema}
                  className="space-y-4"
                >
                  <SecureInput
                    name="email"
                    label="Email Address"
                    type="email"
                    placeholder="user@example.com"
                    required
                    realTimeValidation
                  />
                  <SecureInput
                    name="name"
                    label="Full Name"
                    type="text"
                    placeholder="John Doe"
                    required
                    maxLength={100}
                    realTimeValidation
                  />
                  <SecureInput
                    name="role"
                    label="Role"
                    type="text"
                    placeholder="BasicUser"
                    required
                    pattern="^(SuperAdmin|BasicUser)$"
                    realTimeValidation
                  />
                  <div className="flex gap-2">
                    <Button type="submit">Create User</Button>
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => setShowAddForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </SecureForm>
              </CardContent>
            </Card>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(user.status)}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.last_login ? 
                        new Date(user.last_login).toLocaleDateString() : 
                        'Never'
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {users.length === 0 && !isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No users found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
