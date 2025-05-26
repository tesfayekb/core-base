
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Shield, Users, Settings } from "lucide-react";
import { tenantRoleTemplateService, TenantRoleTemplate, TenantPermissionSet } from '@/services/rbac/tenantCustomization/TenantRoleTemplateService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from "sonner";

export function TenantRBACConfiguration() {
  const { tenantId } = useAuth();
  const [roleTemplates, setRoleTemplates] = useState<TenantRoleTemplate[]>([]);
  const [permissionSets, setPermissionSets] = useState<TenantPermissionSet[]>([]);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [isCreatingPermissionSet, setIsCreatingPermissionSet] = useState(false);
  
  const [newTemplate, setNewTemplate] = useState({
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
      loadTenantConfiguration();
    }
  }, [tenantId]);

  const loadTenantConfiguration = async () => {
    if (!tenantId) return;
    
    try {
      const config = await tenantRoleTemplateService.getTenantRBACConfiguration(tenantId);
      setRoleTemplates(config.roleTemplates);
      setPermissionSets(config.customPermissionSets);
    } catch (error) {
      console.error('Failed to load tenant configuration:', error);
      toast.error('Failed to load tenant configuration');
    }
  };

  const handleCreateRoleTemplate = async () => {
    if (!tenantId || !newTemplate.name.trim()) return;

    try {
      const template = await tenantRoleTemplateService.createRoleTemplate(tenantId, {
        ...newTemplate,
        tenantId,
        metadata: {}
      });
      
      setRoleTemplates(prev => [...prev, template]);
      setNewTemplate({ name: '', description: '', permissions: [], isDefault: false });
      setIsCreatingTemplate(false);
      toast.success('Role template created successfully');
    } catch (error) {
      console.error('Failed to create role template:', error);
      toast.error('Failed to create role template');
    }
  };

  const handleCreatePermissionSet = async () => {
    if (!tenantId || !newPermissionSet.name.trim()) return;

    try {
      const permissionSet = await tenantRoleTemplateService.createCustomPermissionSet(tenantId, {
        ...newPermissionSet,
        tenantId,
        metadata: {}
      });
      
      setPermissionSets(prev => [...prev, permissionSet]);
      setNewPermissionSet({ 
        name: '', 
        description: '', 
        permissions: [], 
        applicableRoles: [], 
        isActive: true 
      });
      setIsCreatingPermissionSet(false);
      toast.success('Permission set created successfully');
    } catch (error) {
      console.error('Failed to create permission set:', error);
      toast.error('Failed to create permission set');
    }
  };

  const addPermissionToTemplate = (permission: string) => {
    if (!newTemplate.permissions.includes(permission)) {
      setNewTemplate(prev => ({
        ...prev,
        permissions: [...prev.permissions, permission]
      }));
    }
  };

  const removePermissionFromTemplate = (permission: string) => {
    setNewTemplate(prev => ({
      ...prev,
      permissions: prev.permissions.filter(p => p !== permission)
    }));
  };

  const availablePermissions = [
    'read:users', 'write:users', 'delete:users',
    'read:documents', 'write:documents', 'delete:documents',
    'read:reports', 'write:reports', 'delete:reports',
    'manage:settings', 'manage:billing', 'manage:integrations'
  ];

  if (!tenantId) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            Please select a tenant to configure RBAC settings.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
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
            Configuration
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Role Templates</CardTitle>
                  <CardDescription>
                    Manage tenant-specific role templates and their permissions
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => setIsCreatingTemplate(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create Template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isCreatingTemplate && (
                <Card className="mb-4">
                  <CardHeader>
                    <CardTitle className="text-lg">Create Role Template</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="template-name">Template Name</Label>
                        <Input
                          id="template-name"
                          value={newTemplate.name}
                          onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g., Content Editor"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="is-default"
                          checked={newTemplate.isDefault}
                          onCheckedChange={(checked) => setNewTemplate(prev => ({ ...prev, isDefault: checked }))}
                        />
                        <Label htmlFor="is-default">Default Template</Label>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="template-description">Description</Label>
                      <Textarea
                        id="template-description"
                        value={newTemplate.description}
                        onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe the role template..."
                      />
                    </div>

                    <div>
                      <Label>Permissions</Label>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {availablePermissions.map(permission => (
                          <Button
                            key={permission}
                            variant={newTemplate.permissions.includes(permission) ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                              if (newTemplate.permissions.includes(permission)) {
                                removePermissionFromTemplate(permission);
                              } else {
                                addPermissionToTemplate(permission);
                              }
                            }}
                          >
                            {permission}
                          </Button>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {newTemplate.permissions.map(permission => (
                          <Badge key={permission} variant="secondary" className="text-xs">
                            {permission}
                            <button
                              onClick={() => removePermissionFromTemplate(permission)}
                              className="ml-1 text-red-500 hover:text-red-700"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={handleCreateRoleTemplate}>Create Template</Button>
                      <Button variant="outline" onClick={() => setIsCreatingTemplate(false)}>
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid gap-4">
                {roleTemplates.map(template => (
                  <Card key={template.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{template.name}</h3>
                            {template.isDefault && (
                              <Badge variant="secondary">Default</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{template.description}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {template.permissions.map(permission => (
                              <Badge key={permission} variant="outline" className="text-xs">
                                {permission}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {roleTemplates.length === 0 && !isCreatingTemplate && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No role templates configured</p>
                    <p className="text-sm">Create your first role template to get started</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Custom Permission Sets</CardTitle>
                  <CardDescription>
                    Define custom permission sets for specific use cases
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => setIsCreatingPermissionSet(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create Permission Set
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isCreatingPermissionSet && (
                <Card className="mb-4">
                  <CardHeader>
                    <CardTitle className="text-lg">Create Permission Set</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="permset-name">Permission Set Name</Label>
                        <Input
                          id="permset-name"
                          value={newPermissionSet.name}
                          onChange={(e) => setNewPermissionSet(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g., Document Management"
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
                    </div>
                    
                    <div>
                      <Label htmlFor="permset-description">Description</Label>
                      <Textarea
                        id="permset-description"
                        value={newPermissionSet.description}
                        onChange={(e) => setNewPermissionSet(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe the permission set..."
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={handleCreatePermissionSet}>Create Permission Set</Button>
                      <Button variant="outline" onClick={() => setIsCreatingPermissionSet(false)}>
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid gap-4">
                {permissionSets.map(permSet => (
                  <Card key={permSet.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{permSet.name}</h3>
                            <Badge variant={permSet.isActive ? "default" : "secondary"}>
                              {permSet.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{permSet.description}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {permissionSets.length === 0 && !isCreatingPermissionSet && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No permission sets configured</p>
                    <p className="text-sm">Create custom permission sets for specific workflows</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>RBAC Configuration Settings</CardTitle>
              <CardDescription>
                Configure tenant-specific RBAC behavior and constraints
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>RBAC configuration settings coming soon...</p>
                <p className="text-sm">This will include role assignment rules, permission constraints, and approval workflows.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
