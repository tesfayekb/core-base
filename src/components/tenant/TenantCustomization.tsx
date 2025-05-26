
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Palette, Save, Upload } from 'lucide-react';
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
    theme: 'light' as 'light' | 'dark',
    features: {
      enableAnalytics: true,
      enableNotifications: true,
      enableCustomDomain: false
    }
  });

  useEffect(() => {
    const loadTenant = async () => {
      if (!tenantId) return;

      try {
        const tenantData = await tenantManagementService.getTenant(tenantId);
        if (tenantData) {
          setTenant(tenantData);
          // Extract customization data from tenant settings
          setFormData({
            customBranding: tenantData.settings.customBranding || {
              logo: '',
              primaryColor: '#3b82f6',
              secondaryColor: '#64748b'
            },
            theme: tenantData.metadata?.theme || 'light',
            features: {
              enableAnalytics: tenantData.settings.features?.includes('analytics') || false,
              enableNotifications: tenantData.settings.features?.includes('notifications') || false,
              enableCustomDomain: tenantData.settings.features?.includes('custom_domain') || false
            }
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
    if (!tenantId || !tenant) return;

    setSaving(true);
    try {
      // Build features array based on enabled features
      const features = [...(tenant.settings.features || [])];
      
      // Remove analytics, notifications, custom_domain to avoid duplicates
      const filteredFeatures = features.filter(f => 
        !['analytics', 'notifications', 'custom_domain'].includes(f)
      );

      // Add back enabled features
      if (formData.features.enableAnalytics) filteredFeatures.push('analytics');
      if (formData.features.enableNotifications) filteredFeatures.push('notifications');
      if (formData.features.enableCustomDomain) filteredFeatures.push('custom_domain');

      await tenantManagementService.updateTenantConfiguration(tenantId, {
        settings: {
          ...tenant.settings,
          customBranding: formData.customBranding,
          features: filteredFeatures
        }
      });

      toast({
        title: "Customization saved",
        description: "Tenant customization settings have been updated successfully."
      });
    } catch (error) {
      console.error('Failed to save customization:', error);
      toast({
        title: "Error",
        description: "Failed to save tenant customization settings.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

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
                    customBranding: { ...prev.customBranding, logo: e.target.value }
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
                    customBranding: { ...prev.customBranding, primaryColor: e.target.value }
                  }))}
                  className="w-20"
                />
                <Input
                  value={formData.customBranding.primaryColor}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    customBranding: { ...prev.customBranding, primaryColor: e.target.value }
                  }))}
                  placeholder="#3b82f6"
                  className="flex-1"
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
                  className="w-20"
                />
                <Input
                  value={formData.customBranding.secondaryColor}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    customBranding: { ...prev.customBranding, secondaryColor: e.target.value }
                  }))}
                  placeholder="#64748b"
                  className="flex-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Feature Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Analytics</Label>
                <p className="text-sm text-muted-foreground">Enable detailed analytics tracking</p>
              </div>
              <Switch
                checked={formData.features.enableAnalytics}
                onCheckedChange={(checked) => setFormData(prev => ({
                  ...prev,
                  features: { ...prev.features, enableAnalytics: checked }
                }))}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notifications</Label>
                <p className="text-sm text-muted-foreground">Enable push notifications</p>
              </div>
              <Switch
                checked={formData.features.enableNotifications}
                onCheckedChange={(checked) => setFormData(prev => ({
                  ...prev,
                  features: { ...prev.features, enableNotifications: checked }
                }))}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Custom Domain</Label>
                <p className="text-sm text-muted-foreground">Allow custom domain configuration</p>
              </div>
              <Switch
                checked={formData.features.enableCustomDomain}
                onCheckedChange={(checked) => setFormData(prev => ({
                  ...prev,
                  features: { ...prev.features, enableCustomDomain: checked }
                }))}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            className="p-6 rounded-lg border-2 border-dashed"
            style={{ 
              borderColor: formData.customBranding.primaryColor + '40',
              background: `linear-gradient(135deg, ${formData.customBranding.primaryColor}10, ${formData.customBranding.secondaryColor}10)`
            }}
          >
            <div className="flex items-center gap-4">
              {formData.customBranding.logo && (
                <img 
                  src={formData.customBranding.logo} 
                  alt="Logo preview" 
                  className="h-12 w-12 object-contain"
                />
              )}
              <div>
                <h3 
                  className="text-lg font-semibold"
                  style={{ color: formData.customBranding.primaryColor }}
                >
                  {tenant?.name || 'Your Tenant Name'}
                </h3>
                <p 
                  className="text-sm"
                  style={{ color: formData.customBranding.secondaryColor }}
                >
                  Preview of your customized tenant appearance
                </p>
              </div>
            </div>
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
