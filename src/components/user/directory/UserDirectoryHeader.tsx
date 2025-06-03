
import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Download, Plus } from 'lucide-react';

interface UserDirectoryHeaderProps {
  userCount: number;
  onExport: () => void;
  onAddUser: () => void;
}

export function UserDirectoryHeader({ userCount, onExport, onAddUser }: UserDirectoryHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Users className="h-6 w-6" />
          User Directory
        </h2>
        <p className="text-muted-foreground">
          Manage and monitor user accounts across your organization
        </p>
      </div>
      
      <div className="flex items-center gap-2">
        <Badge variant="secondary">
          {userCount} users
        </Badge>
        <Button variant="outline" size="sm" onClick={onExport}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
        <Button onClick={onAddUser}>
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>
    </div>
  );
}
