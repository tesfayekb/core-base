
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Save, Palette, Upload } from 'lucide-react';
import { tenantManagementService, TenantConfig } from '@/services/tenant/TenantManagementService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

export function TenantCustomization() {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const [tenant, setTenant] = useState<TenantConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    customBranding: {
      logo: '',
      primaryColor: '#3b82f6',
      secondaryColor: '#64748b'
    },
    features: [] as string[]
  });

  useEffect(() => {
    const loadTenant = async () => {
      if (!tenantId) return;

      try {
        const tenantData = await tenantManagementService.getTenant(tenantId);
        if (tenantData) {
          setTenant(tenantData);
          setFormData({
            customBranding: {
              logo: tenantData.settings.customBranding?.logo || '',
              primaryColor: tenantData.settings.customBranding?.primaryColor || '#3b82f6',
              secondaryColor: tenantData.settings.customBranding?.secondaryColor || '#64748b'
            },
            features: tenantData.settings.features || []
          });
        }
      } catch (error) {
        console.error('Failed to load tenant:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTenant();
  }, [tenantId]);

  const handleSave = async () => {
    if (!tenantId) return;

    setSaving(true);
    try {
      await tenantManagementService.updateTenantConfiguration(tenantId, {
        settings: {
          ...tenant?.settings,
          customBranding: formData.customBranding,
          features: formData.features
        }
      });

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

  const toggleFeature = (feature: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature]
    }));
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
      <div>
        <h1 className="text-3xl font-bold">Tenant Customization</h1>
        <p className="text-muted-foreground">Customize your tenant's appearance and features</p>
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
              <Label htmlFor="logo">Logo URL</Label>
              <div className="flex gap-2">
                <Input
                  id="logo"
                  value={formData.customBranding.logo}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    customBranding: {
                      ...prev.customBranding,
                      logo: e.target.value
                    }
                  }))}
                  placeholder="https://example.com/logo.png"
                />
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primaryColor"
                  type="color"
                  value={formData.customBranding.primaryColor}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    customBranding: {
                      ...prev.customBranding,
                      primaryColor: e.target.value
                    }
                  }))}
                  className="w-20"
                />
                <Input
                  value={formData.customBranding.primaryColor}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    customBranding: {
                      ...prev.customBranding,
                      primaryColor: e.target.value
                    }
                  }))}
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
                  value={formData.customBranding.secondaryColor}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    customBranding: {
                      ...prev.customBranding,
                      secondaryColor: e.target.value
                    }
                  }))}
                  className="w-20"
                />
                <Input
                  value={formData.customBranding.secondaryColor}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    customBranding: {
                      ...prev.customBranding,
                      secondaryColor: e.target.value
                    }
                  }))}
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
                  checked={formData.features.includes(feature.key)}
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
            {formData.features.map((feature) => {
              const featureInfo = availableFeatures.find(f => f.key === feature);
              return (
                <Badge key={feature} variant="secondary">
                  {featureInfo?.label || feature}
                </Badge>
              );
            })}
            {formData.features.length === 0 && (
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
