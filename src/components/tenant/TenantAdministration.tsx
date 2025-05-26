
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Users, 
  UserPlus, 
  UserMinus, 
  Search, 
  Play, 
  Pause, 
  AlertTriangle,
  Settings,
  BarChart3 
} from 'lucide-react';
import { tenantManagementService, TenantConfig } from '@/services/tenant/TenantManagementService';
import { enhancedTenantManagementService } from '@/services/tenant/EnhancedTenantManagementService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

export function TenantAdministration() {
  const { tenantId, user } = useAuth();
  const { toast } = useToast();
  const [tenants, setTenants] = useState<TenantConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      const tenantsData = await tenantManagementService.getAllTenants();
      setTenants(tenantsData);
    } catch (error) {
      console.error('Failed to load tenants:', error);
      toast({
        title: "Error",
        description: "Failed to load tenant information.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendTenant = async (tenantId: string) => {
    try {
      await tenantManagementService.updateTenantConfiguration(tenantId, {
        status: 'suspended'
      });
      await loadTenants();
      toast({
        title: "Tenant suspended",
        description: "Tenant has been suspended successfully."
      });
    } catch (error) {
      console.error('Failed to suspend tenant:', error);
      toast({
        title: "Error",
        description: "Failed to suspend tenant.",
        variant: "destructive"
      });
    }
  };

  const handleActivateTenant = async (tenantId: string) => {
    try {
      await tenantManagementService.updateTenantConfiguration(tenantId, {
        status: 'active'
      });
      await loadTenants();
      toast({
        title: "Tenant activated",
        description: "Tenant has been activated successfully."
      });
    } catch (error) {
      console.error('Failed to activate tenant:', error);
      toast({
        title: "Error",
        description: "Failed to activate tenant.",
        variant: "destructive"
      });
    }
  };

  const getTenantDashboardData = async (tenantId: string) => {
    try {
      const dashboardData = await enhancedTenantManagementService.getTenantDashboardData(tenantId);
      console.log('Tenant dashboard data:', dashboardData);
      toast({
        title: "Dashboard data loaded",
        description: `Loaded data for tenant with ${dashboardData.totalQuotas} quotas.`
      });
    } catch (error) {
      console.error('Failed to get tenant dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load tenant dashboard data.",
        variant: "destructive"
      });
    }
  };

  const filteredTenants = tenants.filter(tenant =>
    tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (tenant.domain && tenant.domain.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'suspended': return 'destructive';
      case 'inactive': return 'secondary';
      default: return 'outline';
    }
  };

  const getTenantStats = () => {
    const total = tenants.length;
    const active = tenants.filter(t => t.status === 'active').length;
    const suspended = tenants.filter(t => t.status === 'suspended').length;
    const inactive = tenants.filter(t => t.status === 'inactive').length;

    return { total, active, suspended, inactive };
  };

  const stats = getTenantStats();

  if (loading) {
    return <div className="p-6">Loading tenant administration...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tenant Administration</h1>
        <p className="text-muted-foreground">System-wide tenant management and monitoring</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Play className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspended</CardTitle>
            <Pause className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.suspended}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.inactive}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Tenant Management
          </CardTitle>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tenants by name, slug, or domain..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Features</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTenants.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell className="font-medium">{tenant.name}</TableCell>
                  <TableCell>{tenant.slug}</TableCell>
                  <TableCell>{tenant.domain || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(tenant.status)}>
                      {tenant.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{tenant.createdAt.toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {tenant.settings.features.slice(0, 2).map((feature) => (
                        <Badge key={feature} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                      {tenant.settings.features.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{tenant.settings.features.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {tenant.status === 'active' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSuspendTenant(tenant.id)}
                        >
                          <Pause className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleActivateTenant(tenant.id)}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => getTenantDashboardData(tenant.id)}
                      >
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredTenants.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No tenants match your search criteria.' : 'No tenants found.'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
