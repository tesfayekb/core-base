
import React, { useState, useEffect } from 'react';
import { tenantManagementService, TenantConfig } from '@/services/tenant/TenantManagementService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Settings, 
  Palette, 
  Shield, 
  Database,
  Save,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TenantSettingsProps {
  tenantId: string;
  onSettingsUpdate?: (tenant: TenantConfig) => void;
  className?: string;
}

export function TenantSettings({ tenantId, onSettingsUpdate, className }: TenantSettingsProps) {
  const [tenant, setTenant] = useState<TenantConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    status: 'active',
    maxUsers: 100,
    storageQuota: 1000,
    features: [] as string[],
    customBranding: {
      logo: '',
      primaryColor: '#0f172a',
      secondaryColor: '#64748b'
    }
  });

  useEffect(() => {
    loadTenant();
  }, [tenantId]);

  const loadTenant = async () => {
    setIsLoading(true);
    try {
      const tenantData = await tenantManagementService.getTenant(tenantId);
      if (tenantData) {
        setTenant(tenantData);
        setFormData({
          name: tenantData.name,
          domain: tenantData.domain || '',
          status: tenantData.status,
          maxUsers: tenantData.settings.maxUsers || 100,
          storageQuota: tenantData.settings.storageQuota || 1000,
          features: tenantData.settings.features || [],
          customBranding: {
            logo: tenantData.settings.customBranding?.logo || '',
            primaryColor: tenantData.settings.customBranding?.primaryColor || '#0f172a',
            secondaryColor: tenantData.settings.customBranding?.secondaryColor || '#64748b'
          }
        });
      }
    } catch (error) {
      console.error('Failed to load tenant:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!tenant) return;

    setIsSaving(true);
    try {
      const updates = {
        name: formData.name,
        domain: formData.domain || undefined,
        status: formData.status as 'active' | 'inactive' | 'suspended',
        settings: {
          ...tenant.settings,
          maxUsers: formData.maxUsers,
          storageQuota: formData.storageQuota,
          features: formData.features,
          customBranding: formData.customBranding
        }
      };

      const updatedTenant = await tenantManagementService.updateTenantConfiguration(tenant.id, updates);
      if (updatedTenant) {
        setTenant(updatedTenant);
        onSettingsUpdate?.(updatedTenant);
      }
    } catch (error) {
      console.error('Failed to update tenant:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleFeature = (feature: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature]
    }));
  };

  const availableFeatures = [
    'advanced_analytics',
    'custom_branding',
    'api_access',
    'sso_integration',
    'audit_logs',
    'data_export',
    'webhooks',
    'custom_domains'
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-5 bg-muted rounded animate-pulse" />
              <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!tenant) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>Failed to load tenant settings</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tenant Settings</h2>
          <p className="text-muted-foreground">
            Configure settings for {tenant.name}
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Basic Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Basic Settings
          </CardTitle>
          <CardDescription>
            Basic tenant configuration and information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Tenant Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter tenant name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="domain">Custom Domain</Label>
              <Input
                id="domain"
                value={formData.domain}
                onChange={(e) => setFormData(prev => ({ ...prev, domain: e.target.value }))}
                placeholder="example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Resource Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Resource Limits
          </CardTitle>
          <CardDescription>
            Configure resource quotas and limits
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="maxUsers">Maximum Users</Label>
              <Input
                id="maxUsers"
                type="number"
                value={formData.maxUsers}
                onChange={(e) => setFormData(prev => ({ ...prev, maxUsers: parseInt(e.target.value) || 0 }))}
                min="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="storageQuota">Storage Quota (MB)</Label>
              <Input
                id="storageQuota"
                type="number"
                value={formData.storageQuota}
                onChange={(e) => setFormData(prev => ({ ...prev, storageQuota: parseInt(e.target.value) || 0 }))}
                min="100"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Toggles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Feature Configuration
          </CardTitle>
          <CardDescription>
            Enable or disable features for this tenant
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {availableFeatures.map((feature) => (
              <div key={feature} className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">
                    {feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {feature === 'advanced_analytics' && 'Advanced reporting and analytics'}
                    {feature === 'custom_branding' && 'Custom logos and colors'}
                    {feature === 'api_access' && 'REST API access'}
                    {feature === 'sso_integration' && 'Single sign-on integration'}
                    {feature === 'audit_logs' && 'Detailed audit logging'}
                    {feature === 'data_export' && 'Data export capabilities'}
                    {feature === 'webhooks' && 'Webhook notifications'}
                    {feature === 'custom_domains' && 'Custom domain support'}
                  </p>
                </div>
                <Switch
                  checked={formData.features.includes(feature)}
                  onCheckedChange={() => toggleFeature(feature)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom Branding */}
      {formData.features.includes('custom_branding') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Custom Branding
            </CardTitle>
            <CardDescription>
              Customize the appearance for this tenant
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="logo">Logo URL</Label>
              <Input
                id="logo"
                value={formData.customBranding.logo}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  customBranding: { ...prev.customBranding, logo: e.target.value }
                }))}
                placeholder="https://example.com/logo.png"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={formData.customBranding.primaryColor}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      customBranding: { ...prev.customBranding, primaryColor: e.target.value }
                    }))}
                    className="w-16 h-10"
                  />
                  <Input
                    value={formData.customBranding.primaryColor}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      customBranding: { ...prev.customBranding, primaryColor: e.target.value }
                    }))}
                    placeholder="#0f172a"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondaryColor">Secondary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="secondaryColor"
                    type="color"
                    value={formData.customBranding.secondaryColor}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      customBranding: { ...prev.customBranding, secondaryColor: e.target.value }
                    }))}
                    className="w-16 h-10"
                  />
                  <Input
                    value={formData.customBranding.secondaryColor}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      customBranding: { ...prev.customBranding, secondaryColor: e.target.value }
                    }))}
                    placeholder="#64748b"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Features */}
      <Card>
        <CardHeader>
          <CardTitle>Active Features</CardTitle>
          <CardDescription>
            Currently enabled features for this tenant
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {formData.features.length > 0 ? (
              formData.features.map((feature) => (
                <Badge key={feature} variant="secondary">
                  {feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No features enabled</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
