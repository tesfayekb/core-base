
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, UserPlus, UserMinus, Search } from 'lucide-react';
import { tenantManagementService, TenantConfig } from '@/services/tenant/TenantManagementService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

interface TenantUser {
  id: string;
  email: string;
  name: string;
  status: string;
  joinedAt: Date;
  isPrimary: boolean;
}

export function TenantAdministration() {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const [tenants, setTenants] = useState<TenantConfig[]>([]);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [tenantsData] = await Promise.all([
          tenantManagementService.getAllTenants()
        ]);
        setTenants(tenantsData);
      } catch (error) {
        console.error('Failed to load administration data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredTenants = tenants.filter(tenant =>
    tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddUser = async (tenantId: string, userId: string) => {
    try {
      await tenantManagementService.addUserToTenant(tenantId, userId);
      toast({
        title: "User added",
        description: "User has been added to the tenant successfully."
      });
    } catch (error) {
      console.error('Failed to add user:', error);
      toast({
        title: "Error",
        description: "Failed to add user to tenant.",
        variant: "destructive"
      });
    }
  };

  const handleRemoveUser = async (tenantId: string, userId: string) => {
    try {
      await tenantManagementService.removeUserFromTenant(tenantId, userId);
      toast({
        title: "User removed",
        description: "User has been removed from the tenant successfully."
      });
    } catch (error) {
      console.error('Failed to remove user:', error);
      toast({
        title: "Error",
        description: "Failed to remove user from tenant.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div className="p-6">Loading tenant administration...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tenant Administration</h1>
        <p className="text-muted-foreground">Manage tenants and user assignments</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Tenants
          </CardTitle>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tenants..."
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
                    <Badge variant={tenant.status === 'active' ? 'default' : 'secondary'}>
                      {tenant.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{tenant.createdAt.toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <UserPlus className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Users className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Tenants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{tenants.length}</div>
            <p className="text-sm text-muted-foreground">
              {tenants.filter(t => t.status === 'active').length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Tenants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {tenants.filter(t => t.status === 'active').length}
            </div>
            <p className="text-sm text-muted-foreground">Currently operational</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Suspended Tenants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {tenants.filter(t => t.status === 'suspended').length}
            </div>
            <p className="text-sm text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
