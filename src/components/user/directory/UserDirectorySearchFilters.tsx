
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { UserDirectorySearch } from './UserDirectorySearch';
import { UserDirectoryFilters } from './UserDirectoryFilters';

interface UserDirectorySearchFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  roleFilter: string;
  onRoleFilterChange: (value: string) => void;
  tenantFilter: string;
  onTenantFilterChange: (value: string) => void;
}

export function UserDirectorySearchFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  roleFilter,
  onRoleFilterChange,
  tenantFilter,
  onTenantFilterChange,
}: UserDirectorySearchFiltersProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          <UserDirectorySearch 
            value={searchQuery}
            onChange={onSearchChange}
          />
          
          <UserDirectoryFilters
            statusFilter={statusFilter}
            onStatusFilterChange={onStatusFilterChange}
            roleFilter={roleFilter}
            onRoleFilterChange={onRoleFilterChange}
            tenantFilter={tenantFilter}
            onTenantFilterChange={onTenantFilterChange}
          />
        </div>
      </CardContent>
    </Card>
  );
}
