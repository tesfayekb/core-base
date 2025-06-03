
import React, { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UserDirectoryFiltersProps {
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  roleFilter: string;
  onRoleFilterChange: (value: string) => void;
  tenantFilter: string;
  onTenantFilterChange: (value: string) => void;
}

interface Role {
  id: string;
  name: string;
  description?: string;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
}

export function UserDirectoryFilters({
  statusFilter,
  onStatusFilterChange,
  roleFilter,
  onRoleFilterChange,
  tenantFilter,
  onTenantFilterChange,
}: UserDirectoryFiltersProps) {
  const { currentTenantId } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const [isLoadingTenants, setIsLoadingTenants] = useState(false);

  useEffect(() => {
    const fetchRoles = async () => {
      setIsLoadingRoles(true);
      try {
        const { data, error } = await supabase
          .from('roles')
          .select('id, name, description')
          .order('name');
        
        if (error) {
          console.error('Error fetching roles:', error);
        } else {
          setRoles(data || []);
        }
      } catch (err) {
        console.error('Error fetching roles:', err);
      } finally {
        setIsLoadingRoles(false);
      }
    };

    const fetchTenants = async () => {
      setIsLoadingTenants(true);
      try {
        const { data, error } = await supabase
          .from('tenants')
          .select('id, name, slug')
          .order('name');
        
        if (error) {
          console.error('Error fetching tenants:', error);
        } else {
          setTenants(data || []);
        }
      } catch (err) {
        console.error('Error fetching tenants:', err);
      } finally {
        setIsLoadingTenants(false);
      }
    };

    fetchRoles();
    fetchTenants();
  }, [currentTenantId]);

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full overflow-hidden">
      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger className="w-32 sm:w-40">
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
          <SelectItem value="pending_verification">Pending</SelectItem>
        </SelectContent>
      </Select>

      <Select value={roleFilter} onValueChange={onRoleFilterChange}>
        <SelectTrigger className="w-32 sm:w-40">
          <SelectValue placeholder={isLoadingRoles ? "Loading..." : "All Roles"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Roles</SelectItem>
          {roles.map((role) => (
            <SelectItem key={role.id} value={role.name}>
              {role.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={tenantFilter} onValueChange={onTenantFilterChange}>
        <SelectTrigger className="w-36 sm:w-48">
          <SelectValue placeholder={isLoadingTenants ? "Loading..." : "All Tenants"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Tenants</SelectItem>
          <SelectItem value="no-tenant">No Tenant</SelectItem>
          {tenants.map((tenant) => (
            <SelectItem key={tenant.id} value={tenant.id}>
              {tenant.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
