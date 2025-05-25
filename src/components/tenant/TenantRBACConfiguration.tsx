
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { 
  tenantRoleTemplateService, 
  type TenantRoleTemplate, 
  type TenantPermissionSet,
  type TenantRBACConfiguration as TenantRBACConfigType
} from '@/services/rbac/tenantCustomization/TenantRoleTemplateService';
import { Plus, Trash2, Edit2, Settings, Shield } from 'lucide-react';

export function TenantRBACConfiguration() {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const [config, setConfig] = useState<TenantRBACConfigType | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [isCreatingPermissionSet, setIsCreatingPermissionSet] = useState(false);

  // Form states
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    permissions: '',
    isDefault: false
  });

  const [permissionSetForm, setPermissionSetForm] = useState({
    name: '',
    description: '',
    permissions: '',
    applicableRoles: '',
    isActive: true
  });

  useEffect(() => {
    loadConfiguration();
  }, [tenantId]);

  const loadConfiguration = async () => {
    if (!tenantId) return;
    
    try {
      setLoading(true);
      const tenantConfig = await tenantRoleTemplateService.getTenantRBACConfiguration(tenantId);
      setConfig(tenantConfig);
    } catch (error) {
      console.error('Failed to load tenant configuration:', error);
      toast({
        title: "Error",
        description: "Failed to load tenant RBAC configuration",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!tenantId || !templateForm.name.trim()) return;

    try {
      const template = await tenantRoleTemplateService.createRoleTemplate(tenantId, {
        tenantId,
        name: templateForm.name,
        description: templateForm.description,
        permissions: templateForm.permissions.split(',').map(p => p.trim()).filter(Boolean),
        isDefault: templateForm.isDefault,
        metadata: {}
      });

      setConfig(prev => prev ? {
        ...prev,
        roleTemplates: [...prev.roleTemplates, template]
      } : null);

      setTemplateForm({ name: '', description: '', permissions: '', isDefault: false });
      setIsCreatingTemplate(false);
      
      toast({
        title: "Success",
        description: "Role template created successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create role template",
        variant: "destructive"
      });
    }
  };

  const handleCreatePermissionSet = async () => {
    if (!tenantId || !permissionSetForm.name.trim()) return;

    try {
      const permissionSet = await tenantRoleTemplateService.createCustomPermissionSet(tenantId, {
        tenantId,
        name: permissionSetForm.name,
        description: permissionSetForm.description,
        permissions: permissionSetForm.permissions.split(',').map(p => p.trim()).filter(Boolean),
        applicableRoles: permissionSetForm.applicableRoles.split(',').map(r => r.trim()).filter(Boolean),
        isActive: permissionSetForm.isActive,
        metadata: {}
      });

      setConfig(prev => prev ? {
        ...prev,
        customPermissionSets: [...prev.customPermissionSets, permissionSet]
      } : null);

      setPermissionSetForm({ name: '', description: '', permissions: '', applicableRoles: '', isActive: true });
      setIsCreatingPermissionSet(false);
      
      toast({
        title: "Success",
        description: "Permission set created successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create permission set",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="h-64 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Failed to load tenant configuration</p>
        <Button onClick={loadConfiguration} className="mt-4">Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Role Templates Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Role Templates
          </CardTitle>
          <CardDescription>
            Manage tenant-specific role templates with custom permission sets
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {config.roleTemplates.length} templates configured
            </p>
            <Button 
              onClick={() => setIsCreatingTemplate(!isCreatingTemplate)}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Template
            </Button>
          </div>

          {isCreatingTemplate && (
            <Card className="border-dashed">
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="templateName">Template Name</Label>
                    <Input
                      id="templateName"
                      value={templateForm.name}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Project Manager"
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-6">
                    <Switch
                      id="isDefault"
                      checked={templateForm.isDefault}
                      onCheckedChange={(checked) => setTemplateForm(prev => ({ ...prev, isDefault: checked }))}
                    />
                    <Label htmlFor="isDefault">Default Template</Label>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="templateDescription">Description</Label>
                  <Textarea
                    id="templateDescription"
                    value={templateForm.description}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Template description"
                  />
                </div>
                
                <div>
                  <Label htmlFor="templatePermissions">Permissions (comma-separated)</Label>
                  <Input
                    id="templatePermissions"
                    value={templateForm.permissions}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, permissions: e.target.value }))}
                    placeholder="users:read, projects:write, reports:read"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={handleCreateTemplate} size="sm">
                    Create Template
                  </Button>
                  <Button 
                    onClick={() => setIsCreatingTemplate(false)} 
                    variant="outline" 
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            {config.roleTemplates.map((template) => (
              <div key={template.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{template.name}</h4>
                    {template.isDefault && <Badge variant="secondary">Default</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {template.permissions.slice(0, 3).map((permission) => (
                      <Badge key={permission} variant="outline" className="text-xs">
                        {permission}
                      </Badge>
                    ))}
                    {template.permissions.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{template.permissions.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom Permission Sets Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Custom Permission Sets
          </CardTitle>
          <CardDescription>
            Define custom permission combinations for specific use cases
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {config.customPermissionSets.length} permission sets configured
            </p>
            <Button 
              onClick={() => setIsCreatingPermissionSet(!isCreatingPermissionSet)}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Permission Set
            </Button>
          </div>

          {isCreatingPermissionSet && (
            <Card className="border-dashed">
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="permSetName">Permission Set Name</Label>
                    <Input
                      id="permSetName"
                      value={permissionSetForm.name}
                      onChange={(e) => setPermissionSetForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Advanced Analytics"
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-6">
                    <Switch
                      id="isActive"
                      checked={permissionSetForm.isActive}
                      onCheckedChange={(checked) => setPermissionSetForm(prev => ({ ...prev, isActive: checked }))}
                    />
                    <Label htmlFor="isActive">Active</Label>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="permSetDescription">Description</Label>
                  <Textarea
                    id="permSetDescription"
                    value={permissionSetForm.description}
                    onChange={(e) => setPermissionSetForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Permission set description"
                  />
                </div>
                
                <div>
                  <Label htmlFor="permSetPermissions">Permissions (comma-separated)</Label>
                  <Input
                    id="permSetPermissions"
                    value={permissionSetForm.permissions}
                    onChange={(e) => setPermissionSetForm(prev => ({ ...prev, permissions: e.target.value }))}
                    placeholder="analytics:read, reports:export, data:analyze"
                  />
                </div>
                
                <div>
                  <Label htmlFor="applicableRoles">Applicable Roles (comma-separated)</Label>
                  <Input
                    id="applicableRoles"
                    value={permissionSetForm.applicableRoles}
                    onChange={(e) => setPermissionSetForm(prev => ({ ...prev, applicableRoles: e.target.value }))}
                    placeholder="manager, analyst, admin"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={handleCreatePermissionSet} size="sm">
                    Create Permission Set
                  </Button>
                  <Button 
                    onClick={() => setIsCreatingPermissionSet(false)} 
                    variant="outline" 
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            {config.customPermissionSets.map((permSet) => (
              <div key={permSet.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{permSet.name}</h4>
                    <Badge variant={permSet.isActive ? "default" : "secondary"}>
                      {permSet.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{permSet.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {permSet.permissions.slice(0, 3).map((permission) => (
                      <Badge key={permission} variant="outline" className="text-xs">
                        {permission}
                      </Badge>
                    ))}
                    {permSet.permissions.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{permSet.permissions.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Customization Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Customization Settings</CardTitle>
          <CardDescription>
            Configure tenant-specific RBAC behavior and restrictions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Allow Custom Roles</Label>
                  <p className="text-sm text-muted-foreground">
                    Users can create custom roles
                  </p>
                </div>
                <Switch checked={config.customizationSettings.allowCustomRoles} />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Allow Permission Modification</Label>
                  <p className="text-sm text-muted-foreground">
                    Users can modify permissions
                  </p>
                </div>
                <Switch checked={config.customizationSettings.allowPermissionModification} />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label>Max Roles Per User</Label>
                <p className="text-sm text-muted-foreground">
                  Current limit: {config.customizationSettings.maxRolesPerUser}
                </p>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Require Approval for Role Changes</Label>
                  <p className="text-sm text-muted-foreground">
                    Role changes need approval
                  </p>
                </div>
                <Switch checked={config.customizationSettings.requireApprovalForRoleChanges} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
