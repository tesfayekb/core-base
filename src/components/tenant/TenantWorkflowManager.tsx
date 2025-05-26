
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Plus, Trash2 } from 'lucide-react';
import { tenantWorkflowService, TenantWorkflow } from '@/services/tenant/TenantWorkflowService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

export function TenantWorkflowManager() {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const [workflows, setWorkflows] = useState<TenantWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    type: '',
    description: ''
  });

  useEffect(() => {
    loadWorkflows();
  }, [tenantId]);

  const loadWorkflows = async () => {
    if (!tenantId) return;

    try {
      const data = await tenantWorkflowService.getWorkflows(tenantId);
      setWorkflows(data);
    } catch (error) {
      console.error('Failed to load workflows:', error);
      toast({
        title: "Error",
        description: "Failed to load workflows.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkflow = async () => {
    if (!tenantId || !newWorkflow.name || !newWorkflow.type) return;

    try {
      await tenantWorkflowService.createWorkflow(
        tenantId,
        newWorkflow.name,
        newWorkflow.type,
        { description: newWorkflow.description },
        [],
        []
      );

      setNewWorkflow({ name: '', type: '', description: '' });
      await loadWorkflows();
      
      toast({
        title: "Workflow created",
        description: "Workflow has been created successfully."
      });
    } catch (error) {
      console.error('Failed to create workflow:', error);
      toast({
        title: "Error",
        description: "Failed to create workflow.",
        variant: "destructive"
      });
    }
  };

  const handleToggleWorkflow = async (workflowId: string, isActive: boolean) => {
    if (!tenantId) return;

    try {
      await tenantWorkflowService.toggleWorkflow(tenantId, workflowId, !isActive);
      await loadWorkflows();
      
      toast({
        title: "Workflow updated",
        description: `Workflow has been ${!isActive ? 'activated' : 'deactivated'}.`
      });
    } catch (error) {
      console.error('Failed to toggle workflow:', error);
      toast({
        title: "Error",
        description: "Failed to update workflow.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
    if (!tenantId) return;

    try {
      await tenantWorkflowService.deleteWorkflow(tenantId, workflowId);
      await loadWorkflows();
      
      toast({
        title: "Workflow deleted",
        description: "Workflow has been deleted successfully."
      });
    } catch (error) {
      console.error('Failed to delete workflow:', error);
      toast({
        title: "Error",
        description: "Failed to delete workflow.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div className="p-6">Loading workflow manager...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Workflow Manager</h1>
        <p className="text-muted-foreground">Manage automated workflows and processes</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create New Workflow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="workflowName">Workflow Name</Label>
              <Input
                id="workflowName"
                value={newWorkflow.name}
                onChange={(e) => setNewWorkflow(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., user_onboarding"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="workflowType">Workflow Type</Label>
              <Input
                id="workflowType"
                value={newWorkflow.type}
                onChange={(e) => setNewWorkflow(prev => ({ ...prev, type: e.target.value }))}
                placeholder="e.g., automation, approval"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="workflowDescription">Description</Label>
            <Input
              id="workflowDescription"
              value={newWorkflow.description}
              onChange={(e) => setNewWorkflow(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of the workflow"
            />
          </div>

          <Button onClick={handleCreateWorkflow} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Create Workflow
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Workflows</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {workflows.map((workflow) => (
              <div key={workflow.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{workflow.workflow_name}</h3>
                    <Badge variant={workflow.is_active ? 'default' : 'secondary'}>
                      {workflow.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Badge variant="outline">{workflow.workflow_type}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={workflow.is_active}
                      onCheckedChange={() => handleToggleWorkflow(workflow.id, workflow.is_active)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteWorkflow(workflow.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  Version {workflow.version} • Created {new Date(workflow.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}

            {workflows.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No workflows configured. Create your first workflow above.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
