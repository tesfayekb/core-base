
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Pause, Trash2, Plus } from 'lucide-react';
import { tenantWorkflowService, TenantWorkflow } from '@/services/tenant/TenantWorkflowService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

export function TenantWorkflowManager() {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const [workflows, setWorkflows] = useState<TenantWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newWorkflow, setNewWorkflow] = useState({
    workflowName: '',
    workflowType: 'automation',
    description: '',
    triggerEvents: '',
    workflowSteps: '',
    conditions: '{}'
  });

  useEffect(() => {
    loadWorkflows();
  }, [tenantId]);

  const loadWorkflows = async () => {
    if (!tenantId) return;

    try {
      const workflowsData = await tenantWorkflowService.getWorkflows(tenantId);
      setWorkflows(workflowsData);
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
    if (!tenantId || !newWorkflow.workflowName) return;

    try {
      const triggerEvents = newWorkflow.triggerEvents.split(',').map(e => e.trim()).filter(e => e);
      const workflowSteps = newWorkflow.workflowSteps ? JSON.parse(newWorkflow.workflowSteps) : [];
      const conditions = newWorkflow.conditions ? JSON.parse(newWorkflow.conditions) : {};

      await tenantWorkflowService.createWorkflow(
        tenantId,
        newWorkflow.workflowName,
        newWorkflow.workflowType,
        { description: newWorkflow.description },
        triggerEvents,
        workflowSteps,
        conditions
      );

      setNewWorkflow({
        workflowName: '',
        workflowType: 'automation',
        description: '',
        triggerEvents: '',
        workflowSteps: '',
        conditions: '{}'
      });
      setShowCreateForm(false);

      await loadWorkflows();
      
      toast({
        title: "Workflow created",
        description: "Workflow has been created successfully."
      });
    } catch (error) {
      console.error('Failed to create workflow:', error);
      toast({
        title: "Error",
        description: "Failed to create workflow. Check your JSON syntax.",
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
        title: isActive ? "Workflow paused" : "Workflow activated",
        description: `Workflow has been ${isActive ? 'paused' : 'activated'} successfully.`
      });
    } catch (error) {
      console.error('Failed to toggle workflow:', error);
      toast({
        title: "Error",
        description: "Failed to toggle workflow.",
        variant: "destructive"
      });
    }
  };

  const handleExecuteWorkflow = async (workflowName: string) => {
    if (!tenantId) return;

    try {
      await tenantWorkflowService.executeWorkflow(tenantId, workflowName, {
        manual_trigger: true,
        timestamp: new Date().toISOString()
      });
      
      toast({
        title: "Workflow executed",
        description: "Workflow has been executed successfully."
      });
    } catch (error) {
      console.error('Failed to execute workflow:', error);
      toast({
        title: "Error",
        description: "Failed to execute workflow.",
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workflow Manager</h1>
          <p className="text-muted-foreground">Manage automated workflows and processes</p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Workflow
        </Button>
      </div>

      {showCreateForm && (
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
                  value={newWorkflow.workflowName}
                  onChange={(e) => setNewWorkflow(prev => ({ ...prev, workflowName: e.target.value }))}
                  placeholder="e.g., user_onboarding"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="workflowType">Workflow Type</Label>
                <Select
                  value={newWorkflow.workflowType}
                  onValueChange={(value) => setNewWorkflow(prev => ({ ...prev, workflowType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="automation">Automation</SelectItem>
                    <SelectItem value="approval">Approval</SelectItem>
                    <SelectItem value="notification">Notification</SelectItem>
                    <SelectItem value="user_onboarding">User Onboarding</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newWorkflow.description}
                onChange={(e) => setNewWorkflow(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this workflow does..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="triggerEvents">Trigger Events (comma-separated)</Label>
              <Input
                id="triggerEvents"
                value={newWorkflow.triggerEvents}
                onChange={(e) => setNewWorkflow(prev => ({ ...prev, triggerEvents: e.target.value }))}
                placeholder="e.g., user_created, user_updated"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="workflowSteps">Workflow Steps (JSON)</Label>
              <Textarea
                id="workflowSteps"
                value={newWorkflow.workflowSteps}
                onChange={(e) => setNewWorkflow(prev => ({ ...prev, workflowSteps: e.target.value }))}
                placeholder='[{"step": "send_email", "order": 1}, {"step": "assign_role", "order": 2}]'
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="conditions">Conditions (JSON)</Label>
              <Textarea
                id="conditions"
                value={newWorkflow.conditions}
                onChange={(e) => setNewWorkflow(prev => ({ ...prev, conditions: e.target.value }))}
                placeholder='{"user_type": "premium", "account_status": "active"}'
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCreateWorkflow}>Create Workflow</Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4">
        {workflows.map((workflow) => (
          <Card key={workflow.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {workflow.workflow_name}
                    <Badge variant={workflow.is_active ? 'default' : 'secondary'}>
                      {workflow.is_active ? 'Active' : 'Paused'}
                    </Badge>
                    <Badge variant="outline">{workflow.workflow_type}</Badge>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {workflow.workflow_config?.description || 'No description provided'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExecuteWorkflow(workflow.workflow_name)}
                    disabled={!workflow.is_active}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleWorkflow(workflow.id, workflow.is_active)}
                  >
                    {workflow.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteWorkflow(workflow.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <strong>Trigger Events:</strong> {workflow.trigger_events.join(', ') || 'None'}
                </div>
                <div>
                  <strong>Steps:</strong> {workflow.workflow_steps.length} configured
                </div>
                <div>
                  <strong>Version:</strong> {workflow.version}
                </div>
                <div>
                  <strong>Created:</strong> {new Date(workflow.created_at).toLocaleDateString()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {workflows.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No workflows configured yet.</p>
              <p className="text-sm text-muted-foreground">Create your first workflow to automate tenant processes.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
