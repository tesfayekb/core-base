
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Settings, Shield, Users, AlertCircle, Plus, Edit, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { tenantRoleTemplateService, TenantRoleTemplate, TenantPermissionSet, TenantRBACConfiguration } from "@/services/rbac/tenantCustomization/TenantRoleTemplateService";

export function TenantRBACConfiguration() {
  const { tenantId } = useAuth();
  const [configuration, setConfiguration] = useState<TenantRBACConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [newRoleTemplate, setNewRoleTemplate] = useState({
    name: '',
    description: '',
    permissions: [] as string[],
    isDefault: false
  });
  const [newPermissionSet, setNewPermissionSet] = useState({
    name: '',
    description: '',
    permissions: [] as string[],
    applicableRoles: [] as string[],
    isActive: true
  });

  useEffect(() => {
    if (tenantId) {
      loadConfiguration();
    }
  }, [tenantId]);

  const loadConfiguration = async () => {
    if (!tenantId) return;
    
    setLoading(true);
    try {
      const config = await tenantRoleTemplateService.getTenantRBACConfiguration(tenantId);
      setConfiguration(config);
      setError(null);
    } catch (err) {
      setError('Failed to load tenant RBAC configuration');
      console.error('Error loading configuration:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveConfiguration = async (updatedConfig: TenantRBACConfiguration) => {
    if (!tenantId) return;
    
    setSaving(true);
    try {
      const validation = await tenantRoleTemplateService.validateTenantCustomization(tenantId, updatedConfig);
      if (!validation.valid) {
        setError(`Configuration validation failed: ${validation.issues.join(', ')}`);
        return;
      }

      setConfiguration(updatedConfig);
      setError(null);
    } catch (err) {
      setError('Failed to save configuration');
      console.error('Error saving configuration:', err);
    } finally {
      setSaving(false);
    }
  };

  const createRoleTemplate = async () => {
    if (!tenantId || !newRoleTemplate.name.trim()) return;

    try {
      const template = await tenantRoleTemplateService.createRoleTemplate(tenantId, {
        ...newRoleTemplate,
        tenantId,
        metadata: {}
      });

      if (configuration) {
        const updatedConfig = {
          ...configuration,
          roleTemplates: [...configuration.roleTemplates, template]
        };
        await saveConfiguration(updatedConfig);
      }

      setNewRoleTemplate({ name: '', description: '', permissions: [], isDefault: false });
    } catch (err) {
      setError('Failed to create role template');
      console.error('Error creating role template:', err);
    }
  };

  const createPermissionSet = async () => {
    if (!tenantId || !newPermissionSet.name.trim()) return;

    try {
      const permissionSet = await tenantRoleTemplateService.createCustomPermissionSet(tenantId, {
        ...newPermissionSet,
        tenantId
      });

      if (configuration) {
        const updatedConfig = {
          ...configuration,
          customPermissionSets: [...configuration.customPermissionSets, permissionSet]
        };
        await saveConfiguration(updatedConfig);
      }

      setNewPermissionSet({ 
        name: '', 
        description: '', 
        permissions: [], 
        applicableRoles: [], 
        isActive: true 
      });
    } catch (err) {
      setError('Failed to create permission set');
      console.error('Error creating permission set:', err);
    }
  };

  const updateCustomizationSettings = async (settings: Partial<TenantRBACConfiguration['customizationSettings']>) => {
    if (!configuration) return;

    const updatedConfig = {
      ...configuration,
      customizationSettings: {
        ...configuration.customizationSettings,
        ...settings
      }
    };

    await saveConfiguration(updatedConfig);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading RBAC configuration...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!configuration) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Failed to load configuration</p>
            <Button onClick={loadConfiguration} className="mt-4">Retry</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Tenant RBAC Configuration</h2>
        <p className="text-muted-foreground">
          Customize roles, permissions, and access control for your tenant
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Role Templates
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Permission Sets
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Create Role Template
                </CardTitle>
                <CardDescription>
                  Define reusable role templates for common access patterns
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="template-name">Template Name</Label>
                  <Input
                    id="template-name"
                    value={newRoleTemplate.name}
                    onChange={(e) => setNewRoleTemplate(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Content Editor"
                  />
                </div>
                <div>
                  <Label htmlFor="template-description">Description</Label>
                  <Textarea
                    id="template-description"
                    value={newRoleTemplate.description}
                    onChange={(e) => setNewRoleTemplate(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what this role template is for..."
                    className="min-h-[80px]"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="template-default"
                    checked={newRoleTemplate.isDefault}
                    onCheckedChange={(checked) => setNewRoleTemplate(prev => ({ ...prev, isDefault: checked }))}
                  />
                  <Label htmlFor="template-default">Set as default template</Label>
                </div>
                <Button onClick={createRoleTemplate} disabled={!newRoleTemplate.name.trim() || saving}>
                  Create Template
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Existing Role Templates</CardTitle>
                <CardDescription>
                  {configuration.roleTemplates.length} template(s) configured
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {configuration.roleTemplates.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No role templates created yet
                    </p>
                  ) : (
                    configuration.roleTemplates.map((template) => (
                      <div key={template.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{template.name}</h4>
                            {template.isDefault && <Badge variant="secondary">Default</Badge>}
                          </div>
                          {template.description && (
                            <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {template.permissions.length} permissions
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="permissions">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Create Permission Set
                </CardTitle>
                <CardDescription>
                  Define custom permission groups for specialized access
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="permset-name">Permission Set Name</Label>
                  <Input
                    id="permset-name"
                    value={newPermissionSet.name}
                    onChange={(e) => setNewPermissionSet(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Advanced Analytics"
                  />
                </div>
                <div>
                  <Label htmlFor="permset-description">Description</Label>
                  <Textarea
                    id="permset-description"
                    value={newPermissionSet.description}
                    onChange={(e) => setNewPermissionSet(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what permissions this set provides..."
                    className="min-h-[80px]"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="permset-active"
                    checked={newPermissionSet.isActive}
                    onCheckedChange={(checked) => setNewPermissionSet(prev => ({ ...prev, isActive: checked }))}
                  />
                  <Label htmlFor="permset-active">Active</Label>
                </div>
                <Button onClick={createPermissionSet} disabled={!newPermissionSet.name.trim() || saving}>
                  Create Permission Set
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Existing Permission Sets</CardTitle>
                <CardDescription>
                  {configuration.customPermissionSets.length} permission set(s) configured
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {configuration.customPermissionSets.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No custom permission sets created yet
                    </p>
                  ) : (
                    configuration.customPermissionSets.map((permSet) => (
                      <div key={permSet.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{permSet.name}</h4>
                            <Badge variant={permSet.isActive ? "default" : "secondary"}>
                              {permSet.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          {permSet.description && (
                            <p className="text-sm text-muted-foreground mt-1">{permSet.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {permSet.permissions.length} permissions, {permSet.applicableRoles.length} applicable roles
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>RBAC Customization Settings</CardTitle>
              <CardDescription>
                Configure how role and permission management works for your tenant
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="allow-custom-roles">Allow Custom Roles</Label>
                    <p className="text-sm text-muted-foreground">Users can create custom roles</p>
                  </div>
                  <Switch
                    id="allow-custom-roles"
                    checked={configuration.customizationSettings.allowCustomRoles}
                    onCheckedChange={(checked) => updateCustomizationSettings({ allowCustomRoles: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="allow-permission-mod">Allow Permission Modification</Label>
                    <p className="text-sm text-muted-foreground">Users can modify role permissions</p>
                  </div>
                  <Switch
                    id="allow-permission-mod"
                    checked={configuration.customizationSettings.allowPermissionModification}
                    onCheckedChange={(checked) => updateCustomizationSettings({ allowPermissionModification: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="require-approval">Require Approval for Role Changes</Label>
                    <p className="text-sm text-muted-foreground">Role changes need approval</p>
                  </div>
                  <Switch
                    id="require-approval"
                    checked={configuration.customizationSettings.requireApprovalForRoleChanges}
                    onCheckedChange={(checked) => updateCustomizationSettings({ requireApprovalForRoleChanges: checked })}
                  />
                </div>

                <div>
                  <Label htmlFor="max-roles">Maximum Roles Per User</Label>
                  <Input
                    id="max-roles"
                    type="number"
                    min="1"
                    max="20"
                    value={configuration.customizationSettings.maxRolesPerUser}
                    onChange={(e) => updateCustomizationSettings({ maxRolesPerUser: parseInt(e.target.value) || 1 })}
                    className="mt-1"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Maximum number of roles a user can have
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
