
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { BulkUserOperationsService, BulkOperationResult } from '@/services/user/BulkUserOperationsService';

interface BulkUserActionsProps {
  selectedUserIds: string[];
  tenantId: string;
  onSuccess?: () => void;
  onClearSelection?: () => void;
}

export function BulkUserActions({ 
  selectedUserIds, 
  tenantId, 
  onSuccess, 
  onClearSelection 
}: BulkUserActionsProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleBulkStatusUpdate = async (status: string) => {
    setLoading(true);
    try {
      const result: BulkOperationResult = await BulkUserOperationsService.bulkUpdateStatus(
        selectedUserIds, 
        status, 
        tenantId
      );
      
      if (result.success) {
        toast({
          title: "Success",
          description: `Updated ${result.successCount} users successfully`
        });
      } else {
        toast({
          title: "Partial Success",
          description: `Updated ${result.successCount} users, ${result.failureCount} failed`,
          variant: "destructive"
        });
      }
      
      onSuccess?.();
      onClearSelection?.();
    } catch (error) {
      console.error('Error updating users:', error);
      toast({
        title: "Error",
        description: "Failed to update users",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    setLoading(true);
    try {
      const result: BulkOperationResult = await BulkUserOperationsService.bulkDelete(
        selectedUserIds, 
        tenantId
      );
      
      if (result.success) {
        toast({
          title: "Success",
          description: `Deleted ${result.successCount} users successfully`
        });
      } else {
        toast({
          title: "Partial Success",
          description: `Deleted ${result.successCount} users, ${result.failureCount} failed`,
          variant: "destructive"
        });
      }
      
      onSuccess?.();
      onClearSelection?.();
    } catch (error) {
      console.error('Error deleting users:', error);
      toast({
        title: "Error",
        description: "Failed to delete users",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkRoleAssignment = async (roleId: string) => {
    setLoading(true);
    try {
      const result: BulkOperationResult = await BulkUserOperationsService.bulkAssignRole(
        selectedUserIds, 
        roleId, 
        tenantId
      );
      
      if (result.success) {
        toast({
          title: "Success",
          description: `Assigned role to ${result.successCount} users successfully`
        });
      } else {
        toast({
          title: "Partial Success",
          description: `Assigned role to ${result.successCount} users, ${result.failureCount} failed`,
          variant: "destructive"
        });
      }
      
      onSuccess?.();
      onClearSelection?.();
    } catch (error) {
      console.error('Error assigning roles:', error);
      toast({
        title: "Error",
        description: "Failed to assign roles",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (selectedUserIds.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-2 p-4 bg-blue-50 rounded-lg">
      <span className="text-sm font-medium text-blue-900">
        {selectedUserIds.length} user{selectedUserIds.length !== 1 ? 's' : ''} selected:
      </span>
      
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleBulkStatusUpdate('active')}
        disabled={loading}
      >
        Activate
      </Button>
      
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleBulkStatusUpdate('suspended')}
        disabled={loading}
      >
        Suspend
      </Button>
      
      <Button
        size="sm"
        variant="destructive"
        onClick={handleBulkDelete}
        disabled={loading}
      >
        Delete
      </Button>
      
      <Button
        size="sm"
        variant="ghost"
        onClick={onClearSelection}
        disabled={loading}
      >
        Clear Selection
      </Button>
    </div>
  );
}
