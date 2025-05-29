
import React, { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Filter } from 'lucide-react';
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
      if (!currentTenantId) return;
      
      setIsLoadingRoles(true);
      try {
        const { data, error } = await supabase
          .from('roles')
          .select('id, name, description')
          .eq('tenant_id', currentTenantId)
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

  const activeFiltersCount = [statusFilter, roleFilter].filter(f => f !== 'all').length;

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Filters</span>
        {activeFiltersCount > 0 && (
          <Badge variant="secondary" className="text-xs">
            {activeFiltersCount}
          </Badge>
        )}
      </div>
      
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending_verification">Pending</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        
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
      </div>
    </div>
  );
}
