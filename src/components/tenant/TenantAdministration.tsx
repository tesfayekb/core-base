
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Settings, 
  Users, 
  Activity, 
  AlertTriangle, 
  Shield,
  Database,
  Trash2,
  Play,
  Pause
} from 'lucide-react';
import { enhancedTenantManagementService } from '@/services/tenant/EnhancedTenantManagementService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

interface TenantSummary {
  id: string;
  name: string;
  status: string;
  userCount: number;
  resourceUsage: number;
  lastActivity: string;
  domain?: string;
}

export function TenantAdministration() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      // Mock data for now - replace with actual service call
      const mockTenants: TenantSummary[] = [
        {
          id: '1',
          name: 'Acme Corporation',
          status: 'active',
          userCount: 150,
          resourceUsage: 75,
          lastActivity: '2024-01-15T10:30:00Z',
          domain: 'acme.example.com'
        },
        {
          id: '2',
          name: 'TechStart Inc',
          status: 'active',
          userCount: 45,
          resourceUsage: 32,
          lastActivity: '2024-01-15T09:15:00Z'
        },
        {
          id: '3',
          name: 'Global Enterprises',
          status: 'suspended',
          userCount: 200,
          resourceUsage: 95,
          lastActivity: '2024-01-14T16:45:00Z',
          domain: 'global.example.com'
        }
      ];
      
      setTenants(mockTenants);
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

  const handleTenantStatusChange = async (tenantId: string, newStatus: string) => {
    try {
      // Update tenant status
      setTenants(prev => 
        prev.map(tenant => 
          tenant.id === tenantId 
            ? { ...tenant, status: newStatus }
            : tenant
        )
      );

      toast({
        title: "Status updated",
        description: `Tenant status changed to ${newStatus}.`
      });
    } catch (error) {
      console.error('Failed to update tenant status:', error);
      toast({
        title: "Error",
        description: "Failed to update tenant status.",
        variant: "destructive"
      });
    }
  };

  const filteredTenants = tenants.filter(tenant =>
    tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.domain?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'suspended': return 'destructive';
      case 'pending': return 'warning';
      default: return 'secondary';
    }
  };

  const getResourceUsageColor = (usage: number) => {
    if (usage >= 90) return 'text-red-600';
    if (usage >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (loading) {
    return <div className="p-6">Loading tenant administration...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tenant Administration</h1>
        <p className="text-muted-foreground">System-wide tenant management and monitoring</p>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Tenant Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <Label htmlFor="search">Search Tenants</Label>
              <Input
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or domain..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tenant List */}
      <div className="grid gap-4">
        {filteredTenants.map((tenant) => (
          <Card key={tenant.id} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <h3 className="text-lg font-semibold">{tenant.name}</h3>
                    {tenant.domain && (
                      <p className="text-sm text-muted-foreground">{tenant.domain}</p>
                    )}
                  </div>
                  <Badge variant={getStatusColor(tenant.status) as any}>
                    {tenant.status}
                  </Badge>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{tenant.userCount} users</span>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center gap-1 text-sm">
                      <Database className="h-4 w-4" />
                      <span className={getResourceUsageColor(tenant.resourceUsage)}>
                        {tenant.resourceUsage}% usage
                      </span>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Activity className="h-4 w-4" />
                      <span>{new Date(tenant.lastActivity).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {tenant.status === 'active' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTenantStatusChange(tenant.id, 'suspended')}
                      >
                        <Pause className="h-4 w-4 mr-1" />
                        Suspend
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTenantStatusChange(tenant.id, 'active')}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Activate
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedTenant(tenant.id)}
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      Manage
                    </Button>
                  </div>
                </div>
              </div>

              {tenant.resourceUsage >= 90 && (
                <div className="mt-4 flex items-center gap-2 text-red-600 bg-red-50 p-2 rounded">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">High resource usage - review quotas</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {filteredTenants.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm ? 'No tenants found matching your search.' : 'No tenants configured.'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* System Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Tenants</p>
                <p className="text-2xl font-bold">{tenants.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">
                  {tenants.reduce((sum, tenant) => sum + tenant.userCount, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Active Tenants</p>
                <p className="text-2xl font-bold">
                  {tenants.filter(t => t.status === 'active').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">High Usage</p>
                <p className="text-2xl font-bold">
                  {tenants.filter(t => t.resourceUsage >= 80).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
