
import React, { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UserDirectoryFiltersProps {
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  roleFilter: string;
  onRoleFilterChange: (value: string) => void;
}

interface Role {
  id: string;
  name: string;
  description?: string;
}

export function UserDirectoryFilters({
  statusFilter,
  onStatusFilterChange,
  roleFilter,
  onRoleFilterChange,
}: UserDirectoryFiltersProps) {
  const { currentTenantId } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);

  useEffect(() => {
    const fetchRoles = async () => {
      setIsLoadingRoles(true);
      try {
        // For SuperAdmin, fetch all roles across all tenants
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

    fetchRoles();
  }, [currentTenantId]);

  return (
    <Select value={roleFilter} onValueChange={onRoleFilterChange}>
      <SelectTrigger className="w-40">
        <SelectValue placeholder={isLoadingRoles ? "Loading..." : "Role"} />
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
  );
}
