
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
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col space-y-4">
          {/* Search Bar - Full width on all screens */}
          <div className="w-full">
            <UserDirectorySearch 
              value={searchQuery}
              onChange={onSearchChange}
            />
          </div>
          
          {/* Filters - Responsive grid layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <UserDirectoryFilters
              statusFilter={statusFilter}
              onStatusFilterChange={onStatusFilterChange}
              roleFilter={roleFilter}
              onRoleFilterChange={onRoleFilterChange}
              tenantFilter={tenantFilter}
              onTenantFilterChange={onTenantFilterChange}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
