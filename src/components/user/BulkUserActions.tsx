
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  Download, 
  Upload, 
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import {
  bulkUserOperationsService,
  BulkOperation,
  BulkRoleAssignmentRequest,
  BulkStatusUpdateRequest
} from '@/services/user/BulkUserOperationsService';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface BulkUserActionsProps {
  selectedUsers: string[];
  tenantId: string;
  onOperationComplete?: () => void;
}

export function BulkUserActions({ selectedUsers, tenantId, onOperationComplete }: BulkUserActionsProps) {
  const [activeOperations, setActiveOperations] = useState<Map<string, BulkOperation>>(new Map());
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  const availableRoles = [
    { id: 'admin', name: 'Administrator' },
    { id: 'manager', name: 'Manager' },
    { id: 'user', name: 'User' },
    { id: 'viewer', name: 'Viewer' }
  ];

  const availableStatuses = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'suspended', label: 'Suspended' }
  ];

  const handleBulkRoleAssignment = async () => {
    if (!selectedRole || selectedUsers.length === 0) return;

    const request: BulkRoleAssignmentRequest = {
      userIds: selectedUsers,
      roleId: selectedRole,
      tenantId
    };

    try {
      const operationId = await bulkUserOperationsService.startBulkRoleAssignment(request);
      
      // Start polling for operation status
      pollOperationStatus(operationId);
    } catch (error) {
      console.error('Failed to start bulk role assignment:', error);
    }
  };

  const handleBulkStatusUpdate = async () => {
    if (!selectedStatus || selectedUsers.length === 0) return;

    const request: BulkStatusUpdateRequest = {
      userIds: selectedUsers,
      status: selectedStatus as 'active' | 'inactive' | 'suspended',
      tenantId
    };

    try {
      const operationId = await bulkUserOperationsService.startBulkStatusUpdate(request);
      
      // Start polling for operation status
      pollOperationStatus(operationId);
    } catch (error) {
      console.error('Failed to start bulk status update:', error);
    }
  };

  const handleBulkExport = async () => {
    if (selectedUsers.length === 0) return;

    try {
      const operationId = await bulkUserOperationsService.startBulkUserExport(selectedUsers, tenantId);
      
      // Start polling for operation status
      pollOperationStatus(operationId);
    } catch (error) {
      console.error('Failed to start bulk export:', error);
    }
  };

  const pollOperationStatus = (operationId: string) => {
    const pollInterval = setInterval(() => {
      const operation = bulkUserOperationsService.getOperation(operationId);
      
      if (operation) {
        setActiveOperations(prev => new Map(prev).set(operationId, operation));
        
        if (operation.status === 'completed' || operation.status === 'failed' || operation.status === 'cancelled') {
          clearInterval(pollInterval);
          if (onOperationComplete) {
            onOperationComplete();
          }
        }
      }
    }, 1000);
  };

  const getOperationStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getOperationStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      in_progress: 'default',
      completed: 'default',
      failed: 'destructive',
      cancelled: 'secondary'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Bulk Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Bulk User Actions</span>
            {selectedUsers.length > 0 && (
              <Badge variant="outline">{selectedUsers.length} users selected</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select users to perform bulk actions</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Bulk Role Assignment */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Assign Role</label>
                <div className="flex space-x-2">
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={handleBulkRoleAssignment}
                    disabled={!selectedRole}
                    size="sm"
                  >
                    Assign
                  </Button>
                </div>
              </div>

              {/* Bulk Status Update */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Update Status</label>
                <div className="flex space-x-2">
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStatuses.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={handleBulkStatusUpdate}
                    disabled={!selectedStatus}
                    size="sm"
                  >
                    Update
                  </Button>
                </div>
              </div>

              {/* Bulk Export */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Export Users</label>
                <Button 
                  onClick={handleBulkExport}
                  variant="outline"
                  className="w-full"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Selected
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Operations */}
      {activeOperations.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Active Operations</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from(activeOperations.values()).map((operation) => (
                <div key={operation.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getOperationStatusIcon(operation.status)}
                      <span className="font-medium">
                        {operation.type.replace('_', ' ').toUpperCase()}
                      </span>
                      {getOperationStatusBadge(operation.status)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {operation.processedItems}/{operation.totalItems} completed
                    </div>
                  </div>
                  
                  <Progress 
                    value={(operation.processedItems / operation.totalItems) * 100} 
                    className="mb-2" 
                  />
                  
                  {operation.failedItems > 0 && (
                    <div className="flex items-center space-x-1 text-sm text-red-600">
                      <AlertTriangle className="h-3 w-3" />
                      <span>{operation.failedItems} failed</span>
                    </div>
                  )}
                  
                  {operation.status === 'completed' && operation.completedAt && (
                    <div className="text-sm text-muted-foreground">
                      Completed at {new Date(operation.completedAt).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
