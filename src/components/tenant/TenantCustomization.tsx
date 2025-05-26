
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Save, Palette, Upload, Download, RotateCcw } from 'lucide-react';
import { tenantCustomizationService } from '@/services/tenant/TenantCustomizationService';
import { tenantConfigurationService } from '@/services/tenant/TenantConfigurationService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

export function TenantCustomization() {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [branding, setBranding] = useState({
    logo: '',
    primaryColor: '#3b82f6',
    secondaryColor: '#64748b',
    companyName: '',
    favicon: ''
  });
  const [features, setFeatures] = useState<string[]>([]);

  useEffect(() => {
    loadCustomizations();
  }, [tenantId]);

  const loadCustomizations = async () => {
    if (!tenantId) return;

    try {
      const [brandingConfig, featureCustomizations] = await Promise.all([
        tenantCustomizationService.getBrandingConfiguration(tenantId),
        tenantCustomizationService.getCustomizations(tenantId, 'feature_toggle')
      ]);

      setBranding(brandingConfig);
      setFeatures(featureCustomizations.map(f => f.customization_key));
    } catch (error) {
      console.error('Failed to load customizations:', error);
      toast({
        title: "Error",
        description: "Failed to load tenant customizations.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!tenantId) return;

    setSaving(true);
    try {
      // Save branding configuration
      await tenantCustomizationService.setBrandingConfiguration(tenantId, branding);

      // Save feature toggles
      const availableFeatures = [
        'advanced-analytics', 'custom-branding', 'api-access',
        'sso', 'audit-logs', 'data-export'
      ];

      // Remove all existing feature toggles
      for (const feature of availableFeatures) {
        await tenantCustomizationService.deleteCustomization(tenantId, 'feature_toggle', feature);
      }

      // Add enabled features
      for (const feature of features) {
        await tenantCustomizationService.setCustomization(
          tenantId,
          'feature_toggle',
          feature,
          true
        );
      }

      toast({
        title: "Customization saved",
        description: "Tenant customization has been updated successfully."
      });
    } catch (error) {
      console.error('Failed to save customization:', error);
      toast({
        title: "Error",
        description: "Failed to save tenant customization.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleExportConfiguration = async () => {
    if (!tenantId) return;

    try {
      const config = await tenantConfigurationService.exportConfiguration(tenantId);
      const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tenant-config-${tenantId}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Configuration exported",
        description: "Tenant configuration has been exported successfully."
      });
    } catch (error) {
      console.error('Failed to export configuration:', error);
      toast({
        title: "Error",
        description: "Failed to export tenant configuration.",
        variant: "destructive"
      });
    }
  };

  const handleBackupConfiguration = async () => {
    if (!tenantId) return;

    try {
      await tenantConfigurationService.backupConfiguration(
        tenantId,
        `Manual backup - ${new Date().toISOString()}`
      );

      toast({
        title: "Backup created",
        description: "Configuration backup has been created successfully."
      });
    } catch (error) {
      console.error('Failed to create backup:', error);
      toast({
        title: "Error",
        description: "Failed to create configuration backup.",
        variant: "destructive"
      });
    }
  };

  const toggleFeature = (feature: string) => {
    setFeatures(prev =>
      prev.includes(feature)
        ? prev.filter(f => f !== feature)
        : [...prev, feature]
    );
  };

  const availableFeatures = [
    { key: 'advanced-analytics', label: 'Advanced Analytics' },
    { key: 'custom-branding', label: 'Custom Branding' },
    { key: 'api-access', label: 'API Access' },
    { key: 'sso', label: 'Single Sign-On' },
    { key: 'audit-logs', label: 'Audit Logs' },
    { key: 'data-export', label: 'Data Export' }
  ];

  if (loading) {
    return <div className="p-6">Loading tenant customization...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tenant Customization</h1>
          <p className="text-muted-foreground">Customize your tenant's appearance and features</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleBackupConfiguration}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Backup
          </Button>
          <Button variant="outline" onClick={handleExportConfiguration}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Branding
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={branding.companyName}
                onChange={(e) => setBranding(prev => ({ ...prev, companyName: e.target.value }))}
                placeholder="Your Company Name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo">Logo URL</Label>
              <div className="flex gap-2">
                <Input
                  id="logo"
                  value={branding.logo}
                  onChange={(e) => setBranding(prev => ({ ...prev, logo: e.target.value }))}
                  placeholder="https://example.com/logo.png"
                />
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="favicon">Favicon URL</Label>
              <Input
                id="favicon"
                value={branding.favicon}
                onChange={(e) => setBranding(prev => ({ ...prev, favicon: e.target.value }))}
                placeholder="https://example.com/favicon.ico"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primaryColor"
                  type="color"
                  value={branding.primaryColor}
                  onChange={(e) => setBranding(prev => ({ ...prev, primaryColor: e.target.value }))}
                  className="w-20"
                />
                <Input
                  value={branding.primaryColor}
                  onChange={(e) => setBranding(prev => ({ ...prev, primaryColor: e.target.value }))}
                  placeholder="#3b82f6"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondaryColor">Secondary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="secondaryColor"
                  type="color"
                  value={branding.secondaryColor}
                  onChange={(e) => setBranding(prev => ({ ...prev, secondaryColor: e.target.value }))}
                  className="w-20"
                />
                <Input
                  value={branding.secondaryColor}
                  onChange={(e) => setBranding(prev => ({ ...prev, secondaryColor: e.target.value }))}
                  placeholder="#64748b"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Feature Toggles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {availableFeatures.map((feature) => (
              <div key={feature.key} className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor={feature.key}>{feature.label}</Label>
                </div>
                <Switch
                  id={feature.key}
                  checked={features.includes(feature.key)}
                  onCheckedChange={() => toggleFeature(feature.key)}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {features.map((feature) => {
              const featureInfo = availableFeatures.find(f => f.key === feature);
              return (
                <Badge key={feature} variant="secondary">
                  {featureInfo?.label || feature}
                </Badge>
              );
            })}
            {features.length === 0 && (
              <p className="text-muted-foreground">No features enabled</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Customization'}
        </Button>
      </div>
    </div>
  );
}
