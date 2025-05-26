
import React from 'react';

interface Role {
  id: string;
  name: string;
  description?: string;
}

interface RoleSelectionProps {
  roles: Role[];
  selectedRoleIds: string[];
  onRoleToggle: (roleId: string) => void;
}

export function RoleSelection({ roles, selectedRoleIds, onRoleToggle }: RoleSelectionProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Roles</label>
      <div className="space-y-2 max-h-32 overflow-y-auto border rounded p-2">
        {roles.map((role) => (
          <label key={role.id} className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedRoleIds.includes(role.id)}
              onChange={() => onRoleToggle(role.id)}
              className="rounded"
            />
            <div className="flex-1">
              <div className="text-sm font-medium">{role.name}</div>
              {role.description && (
                <div className="text-xs text-muted-foreground">{role.description}</div>
              )}
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
