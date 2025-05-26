
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Shield, Zap } from 'lucide-react';
import { tenantQuotaService, ResourceQuota, ResourceUsage } from '@/services/tenant/TenantQuotaService';
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
    hardLimit: true,
    warningThreshold: 80
  });

  useEffect(() => {
    loadQuotaData();
  }, [tenantId]);

  const loadQuotaData = async () => {
    if (!tenantId) return;

    try {
      const [quotasData, usageData] = await Promise.all([
        tenantQuotaService.getTenantQuotas(tenantId),
        tenantQuotaService.getTenantUsage(tenantId)
      ]);

      setQuotas(quotasData);
      setUsage(usageData);
    } catch (error) {
      console.error('Failed to load quota data:', error);
      toast({
        title: "Error",
        description: "Failed to load quota data.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuota = async () => {
    if (!tenantId || !newQuota.resourceType) return;

    try {
      await tenantQuotaService.setTenantQuota(
        tenantId,
        newQuota.resourceType,
        newQuota.quotaLimit,
        newQuota.hardLimit,
        newQuota.warningThreshold
      );

      setNewQuota({
        resourceType: '',
        quotaLimit: 0,
        hardLimit: true,
        warningThreshold: 80
      });

      await loadQuotaData();
      
      toast({
        title: "Quota created",
        description: "Resource quota has been created successfully."
      });
    } catch (error) {
      console.error('Failed to create quota:', error);
      toast({
        title: "Error",
        description: "Failed to create resource quota.",
        variant: "destructive"
      });
    }
  };

  const getUsagePercentage = (resourceType: string): number => {
    const quota = quotas.find(q => q.resource_type === resourceType);
    const currentUsage = usage.find(u => u.resource_type === resourceType);
    
    if (!quota || !currentUsage) return 0;
    
    return quota.quota_limit > 0 
      ? (currentUsage.current_usage / quota.quota_limit) * 100 
      : 0;
  };

  const getUsageStatus = (percentage: number, quota: ResourceQuota) => {
    if (percentage >= quota.warning_threshold) {
      return percentage >= 100 ? 'critical' : 'warning';
    }
    return 'normal';
  };

  if (loading) {
    return <div className="p-6">Loading quota management...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Quota Management</h1>
        <p className="text-muted-foreground">Manage resource quotas and monitor usage</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Create New Quota</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="resourceType">Resource Type</Label>
              <Input
                id="resourceType"
                value={newQuota.resourceType}
                onChange={(e) => setNewQuota(prev => ({ ...prev, resourceType: e.target.value }))}
                placeholder="e.g., users, storage_mb, api_calls_monthly"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quotaLimit">Quota Limit</Label>
              <Input
                id="quotaLimit"
                type="number"
                value={newQuota.quotaLimit}
                onChange={(e) => setNewQuota(prev => ({ ...prev, quotaLimit: parseInt(e.target.value) || 0 }))}
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="warningThreshold">Warning Threshold (%)</Label>
              <Input
                id="warningThreshold"
                type="number"
                value={newQuota.warningThreshold}
                onChange={(e) => setNewQuota(prev => ({ ...prev, warningThreshold: parseInt(e.target.value) || 80 }))}
                min="0"
                max="100"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="hardLimit"
                checked={newQuota.hardLimit}
                onCheckedChange={(checked) => setNewQuota(prev => ({ ...prev, hardLimit: checked }))}
              />
              <Label htmlFor="hardLimit">Hard Limit (enforce quota)</Label>
            </div>

            <Button onClick={handleCreateQuota} className="w-full">
              Create Quota
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quota Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{quotas.length}</div>
                  <div className="text-sm text-muted-foreground">Total Quotas</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {quotas.filter(q => getUsageStatus(getUsagePercentage(q.resource_type), q) === 'warning').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Warnings</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {quotas.filter(q => getUsageStatus(getUsagePercentage(q.resource_type), q) === 'critical').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Critical</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Quotas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {quotas.map((quota) => {
              const percentage = getUsagePercentage(quota.resource_type);
              const status = getUsageStatus(percentage, quota);
              const currentUsage = usage.find(u => u.resource_type === quota.resource_type);

              return (
                <div key={quota.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{quota.resource_type}</h3>
                      {quota.hard_limit ? (
                        <Shield className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Zap className="h-4 w-4 text-yellow-600" />
                      )}
                      {status === 'warning' && <AlertTriangle className="h-4 w-4 text-orange-600" />}
                      {status === 'critical' && <AlertTriangle className="h-4 w-4 text-red-600" />}
                    </div>
                    <Badge variant={status === 'critical' ? 'destructive' : status === 'warning' ? 'secondary' : 'default'}>
                      {percentage.toFixed(1)}% used
                    </Badge>
                  </div>
                  
                  <Progress value={percentage} className="mb-2" />
                  
                  <div className="text-sm text-muted-foreground">
                    {currentUsage?.current_usage || 0} / {quota.quota_limit} 
                    ({quota.hard_limit ? 'Hard' : 'Soft'} limit, {quota.warning_threshold}% warning)
                  </div>
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
