
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { rbacService } from '@/services/rbac/rbacService';
import { Settings } from 'lucide-react';

export function RoleManagement() {
  const [roleId, setRoleId] = useState('');
  const [userId, setUserId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleAssignRole = async () => {
    if (!roleId || !userId) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await rbacService.assignRole(
        'current-user-id',
        userId,
        roleId,
        'default-tenant'
      );

      if (result.success) {
        toast({
          title: 'Success',
          description: result.message
        });
        setRoleId('');
        setUserId('');
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to assign role',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Role Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">User ID</label>
          <Input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Enter user ID"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Role ID</label>
          <Input
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            placeholder="Enter role ID"
          />
        </div>
        <Button 
          onClick={handleAssignRole}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Assigning...' : 'Assign Role'}
        </Button>
      </CardContent>
    </Card>
  );
}
