
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Plus, Settings } from 'lucide-react';
import { tenantQuotaService, type ResourceQuota, type ResourceUsage } from '@/services/tenant/TenantQuotaService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

export function TenantQuotaManagement() {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const [quotas, setQuotas] = useState<ResourceQuota[]>([]);
  const [usage, setUsage] = useState<ResourceUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [newQuota, setNewQuota] = useState({
    resourceType: '',
    quotaLimit: 0,
    warningThreshold: 80
  });

  useEffect(() => {
    loadQuotasAndUsage();
  }, [tenantId]);

  const loadQuotasAndUsage = async () => {
    if (!tenantId) return;

    try {
      const [quotasData, usageData] = await Promise.all([
        tenantQuotaService.getTenantQuotas(tenantId),
        tenantQuotaService.getTenantUsage(tenantId)
      ]);

      setQuotas(quotasData);
      setUsage(usageData);
    } catch (error) {
      console.error('Failed to load quotas and usage:', error);
      toast({
        title: "Error",
        description: "Failed to load quota information.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuota = async () => {
    if (!tenantId || !newQuota.resourceType || newQuota.quotaLimit <= 0) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    try {
      await tenantQuotaService.setTenantQuota(
        tenantId,
        newQuota.resourceType,
        newQuota.quotaLimit,
        true,
        newQuota.warningThreshold
      );

      setNewQuota({ resourceType: '', quotaLimit: 0, warningThreshold: 80 });
      await loadQuotasAndUsage();
      
      toast({
        title: "Quota created",
        description: "Resource quota has been created successfully."
      });
    } catch (error) {
      console.error('Failed to create quota:', error);
      toast({
        title: "Error",
        description: "Failed to create quota.",
        variant: "destructive"
      });
    }
  };

  const getUsagePercentage = (resourceType: string): number => {
    const quota = quotas.find(q => q.resource_type === resourceType);
    const currentUsage = usage.find(u => u.resource_type === resourceType);
    
    if (!quota || !currentUsage || quota.quota_limit === 0) return 0;
    
    return (currentUsage.current_usage / quota.quota_limit) * 100;
  };

  const getUsageStatus = (percentage: number, warningThreshold: number) => {
    if (percentage >= 100) return { color: 'destructive', status: 'Exceeded' };
    if (percentage >= warningThreshold) return { color: 'warning', status: 'Warning' };
    return { color: 'default', status: 'Normal' };
  };

  if (loading) {
    return <div className="p-6">Loading quota management...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Quota Management</h1>
        <p className="text-muted-foreground">Monitor and manage resource quotas</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Quota
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="resourceType">Resource Type</Label>
              <Input
                id="resourceType"
                value={newQuota.resourceType}
                onChange={(e) => setNewQuota(prev => ({ ...prev, resourceType: e.target.value }))}
                placeholder="e.g., users, storage_mb, api_calls"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quotaLimit">Quota Limit</Label>
              <Input
                id="quotaLimit"
                type="number"
                value={newQuota.quotaLimit}
                onChange={(e) => setNewQuota(prev => ({ ...prev, quotaLimit: parseInt(e.target.value) || 0 }))}
                placeholder="Enter limit"
                min="1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="warningThreshold">Warning Threshold (%)</Label>
              <Input
                id="warningThreshold"
                type="number"
                value={newQuota.warningThreshold}
                onChange={(e) => setNewQuota(prev => ({ ...prev, warningThreshold: parseInt(e.target.value) || 80 }))}
                placeholder="80"
                min="1"
                max="100"
              />
            </div>
          </div>

          <Button onClick={handleCreateQuota} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Create Quota
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Current Quotas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {quotas.map((quota) => {
              const currentUsage = usage.find(u => u.resource_type === quota.resource_type);
              const usagePercentage = getUsagePercentage(quota.resource_type);
              const status = getUsageStatus(usagePercentage, quota.warning_threshold);

              return (
                <div key={quota.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold capitalize">
                        {quota.resource_type.replace('_', ' ')}
                      </h3>
                      <Badge variant={status.color as any}>
                        {status.status}
                      </Badge>
                      {quota.hard_limit && (
                        <Badge variant="outline">Hard Limit</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {currentUsage?.current_usage || 0} / {quota.quota_limit}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Progress 
                      value={Math.min(usagePercentage, 100)} 
                      className="h-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{usagePercentage.toFixed(1)}% used</span>
                      <span>Warning at {quota.warning_threshold}%</span>
                    </div>
                  </div>

                  {usagePercentage >= quota.warning_threshold && (
                    <div className="flex items-center gap-2 mt-2 text-amber-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm">
                        {usagePercentage >= 100 ? 'Quota exceeded!' : 'Approaching quota limit'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}

            {quotas.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No quotas configured. Create your first quota above.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
