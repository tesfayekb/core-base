
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Save, Plus, X } from 'lucide-react';
import { tenantManagementService, TenantConfig } from '@/services/tenant/TenantManagementService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

export function TenantSettings() {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const [tenant, setTenant] = useState<TenantConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    maxUsers: 100,
    storageQuota: 1000,
    features: [] as string[]
  });
  const [newFeature, setNewFeature] = useState('');

  useEffect(() => {
    const loadTenant = async () => {
      if (!tenantId) return;

      try {
        const tenantData = await tenantManagementService.getTenant(tenantId);
        if (tenantData) {
          setTenant(tenantData);
          setFormData({
            name: tenantData.name,
            domain: tenantData.domain || '',
            maxUsers: tenantData.settings.maxUsers || 100,
            storageQuota: tenantData.settings.storageQuota || 1000,
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
        name: formData.name,
        domain: formData.domain || undefined,
        settings: {
          maxUsers: formData.maxUsers,
          storageQuota: formData.storageQuota,
          features: formData.features
        }
      });

      toast({
        title: "Settings saved",
        description: "Tenant settings have been updated successfully."
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast({
        title: "Error",
        description: "Failed to save tenant settings.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const addFeature = () => {
    if (newFeature && !formData.features.includes(newFeature)) {
      setFormData(prev => ({
        ...prev,
        features: [...prev.features, newFeature]
      }));
      setNewFeature('');
    }
  };

  const removeFeature = (feature: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter(f => f !== feature)
    }));
  };

  if (loading) {
    return <div className="p-6">Loading tenant settings...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tenant Settings</h1>
        <p className="text-muted-foreground">Manage your tenant configuration</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resource Limits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Features</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {formData.features.map((feature) => (
              <Badge key={feature} variant="secondary" className="flex items-center gap-1">
                {feature}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0"
                  onClick={() => removeFeature(feature)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              value={newFeature}
              onChange={(e) => setNewFeature(e.target.value)}
              placeholder="Add new feature"
              onKeyPress={(e) => e.key === 'Enter' && addFeature()}
            />
            <Button onClick={addFeature} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
