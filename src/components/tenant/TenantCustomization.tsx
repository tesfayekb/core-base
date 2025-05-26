
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Palette, Save, Plus, X } from 'lucide-react';
import { tenantCustomizationService, type TenantCustomization } from '@/services/tenant/TenantCustomizationService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

export function TenantCustomization() {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const [customizations, setCustomizations] = useState<TenantCustomization[]>([]);
  const [branding, setBranding] = useState({
    logo: '',
    primaryColor: '#3b82f6',
    secondaryColor: '#64748b',
    companyName: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCustomizations();
  }, [tenantId]);

  const loadCustomizations = async () => {
    if (!tenantId) return;

    try {
      const [customizationsData, brandingData] = await Promise.all([
        tenantCustomizationService.getCustomizations(tenantId),
        tenantCustomizationService.getBrandingConfiguration(tenantId)
      ]);

      setCustomizations(customizationsData);
      setBranding(brandingData);
    } catch (error) {
      console.error('Failed to load customizations:', error);
      toast({
        title: "Error",
        description: "Failed to load customizations.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBranding = async () => {
    if (!tenantId) return;

    setSaving(true);
    try {
      await tenantCustomizationService.setBrandingConfiguration(tenantId, branding);
      await loadCustomizations();
      
      toast({
        title: "Branding saved",
        description: "Branding configuration has been updated successfully."
      });
    } catch (error) {
      console.error('Failed to save branding:', error);
      toast({
        title: "Error",
        description: "Failed to save branding configuration.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const groupedCustomizations = customizations.reduce((acc, custom) => {
    if (!acc[custom.customization_type]) {
      acc[custom.customization_type] = [];
    }
    acc[custom.customization_type].push(custom);
    return acc;
  }, {} as Record<string, TenantCustomization[]>);

  if (loading) {
    return <div className="p-6">Loading customization settings...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tenant Customization</h1>
        <p className="text-muted-foreground">Customize your tenant's appearance and behavior</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Branding
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <Input
                id="logo"
                value={branding.logo}
                onChange={(e) => setBranding(prev => ({ ...prev, logo: e.target.value }))}
                placeholder="https://example.com/logo.png"
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
                  className="w-16 h-10"
                />
                <Input
                  value={branding.primaryColor}
                  onChange={(e) => setBranding(prev => ({ ...prev, primaryColor: e.target.value }))}
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
                  value={branding.secondaryColor}
                  onChange={(e) => setBranding(prev => ({ ...prev, secondaryColor: e.target.value }))}
                  className="w-16 h-10"
                />
                <Input
                  value={branding.secondaryColor}
                  onChange={(e) => setBranding(prev => ({ ...prev, secondaryColor: e.target.value }))}
                  placeholder="#64748b"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <Button onClick={handleSaveBranding} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Branding'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Customizations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(groupedCustomizations).map(([type, customs]) => (
              <div key={type} className="space-y-3">
                <h3 className="text-lg font-semibold capitalize">{type.replace('_', ' ')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {customs.map((custom) => (
                    <div key={custom.id} className="border rounded p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{custom.customization_key}</span>
                        <Badge variant="outline" className="text-xs">
                          {custom.customization_type}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {typeof custom.customization_value === 'string' 
                          ? custom.customization_value 
                          : JSON.stringify(custom.customization_value)
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {Object.keys(groupedCustomizations).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No customizations configured yet. Set up branding above to get started.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
