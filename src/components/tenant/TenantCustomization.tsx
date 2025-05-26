
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Palette, Upload, Save, Eye } from 'lucide-react';
import { tenantManagementService, TenantConfig } from '@/services/tenant/TenantManagementService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

export function TenantCustomization() {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const [tenant, setTenant] = useState<TenantConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customization, setCustomization] = useState({
    logo: '',
    primaryColor: '#3b82f6',
    secondaryColor: '#64748b',
    customFields: {} as Record<string, any>
  });

  useEffect(() => {
    const loadTenant = async () => {
      if (!tenantId) return;

      try {
        const tenantData = await tenantManagementService.getTenant(tenantId);
        if (tenantData) {
          setTenant(tenantData);
          setCustomization({
            logo: tenantData.settings.customBranding?.logo || '',
            primaryColor: tenantData.settings.customBranding?.primaryColor || '#3b82f6',
            secondaryColor: tenantData.settings.customBranding?.secondaryColor || '#64748b',
            customFields: tenantData.metadata || {}
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
          customBranding: {
            logo: customization.logo,
            primaryColor: customization.primaryColor,
            secondaryColor: customization.secondaryColor
          }
        },
        metadata: customization.customFields
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

  if (loading) {
    return <div className="p-6">Loading tenant customization...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tenant Customization</h1>
        <p className="text-muted-foreground">Customize your tenant's appearance and branding</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Brand Colors
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primaryColor"
                  type="color"
                  value={customization.primaryColor}
                  onChange={(e) => setCustomization(prev => ({ ...prev, primaryColor: e.target.value }))}
                  className="w-16 h-10"
                />
                <Input
                  value={customization.primaryColor}
                  onChange={(e) => setCustomization(prev => ({ ...prev, primaryColor: e.target.value }))}
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
                  value={customization.secondaryColor}
                  onChange={(e) => setCustomization(prev => ({ ...prev, secondaryColor: e.target.value }))}
                  className="w-16 h-10"
                />
                <Input
                  value={customization.secondaryColor}
                  onChange={(e) => setCustomization(prev => ({ ...prev, secondaryColor: e.target.value }))}
                  placeholder="#64748b"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <h4 className="text-sm font-medium mb-2">Color Preview</h4>
              <div className="flex gap-2">
                <div 
                  className="w-8 h-8 rounded"
                  style={{ backgroundColor: customization.primaryColor }}
                />
                <div 
                  className="w-8 h-8 rounded"
                  style={{ backgroundColor: customization.secondaryColor }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Logo & Assets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="logo">Logo URL</Label>
              <Input
                id="logo"
                value={customization.logo}
                onChange={(e) => setCustomization(prev => ({ ...prev, logo: e.target.value }))}
                placeholder="https://example.com/logo.png"
              />
            </div>

            {customization.logo && (
              <div className="p-4 border rounded-lg">
                <h4 className="text-sm font-medium mb-2">Logo Preview</h4>
                <img 
                  src={customization.logo} 
                  alt="Tenant logo" 
                  className="max-w-32 max-h-16 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}

            <Button variant="outline" className="w-full">
              <Upload className="h-4 w-4 mr-2" />
              Upload Logo
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Custom Fields</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Add custom metadata fields for your tenant
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Company Type</Label>
              <Input
                value={customization.customFields.companyType || ''}
                onChange={(e) => setCustomization(prev => ({
                  ...prev,
                  customFields: { ...prev.customFields, companyType: e.target.value }
                }))}
                placeholder="e.g., Enterprise, SMB, Startup"
              />
            </div>

            <div className="space-y-2">
              <Label>Industry</Label>
              <Input
                value={customization.customFields.industry || ''}
                onChange={(e) => setCustomization(prev => ({
                  ...prev,
                  customFields: { ...prev.customFields, industry: e.target.value }
                }))}
                placeholder="e.g., Technology, Healthcare, Finance"
              />
            </div>

            <div className="space-y-2">
              <Label>Region</Label>
              <Input
                value={customization.customFields.region || ''}
                onChange={(e) => setCustomization(prev => ({
                  ...prev,
                  customFields: { ...prev.customFields, region: e.target.value }
                }))}
                placeholder="e.g., North America, Europe, Asia"
              />
            </div>

            <div className="space-y-2">
              <Label>Support Tier</Label>
              <Input
                value={customization.customFields.supportTier || ''}
                onChange={(e) => setCustomization(prev => ({
                  ...prev,
                  customFields: { ...prev.customFields, supportTier: e.target.value }
                }))}
                placeholder="e.g., Basic, Premium, Enterprise"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline">
          <Eye className="h-4 w-4 mr-2" />
          Preview Changes
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Customization'}
        </Button>
      </div>
    </div>
  );
}
