
import React from 'react';
import { Input } from "@/components/ui/input";
import { Search } from 'lucide-react';

interface UserDirectorySearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function UserDirectorySearch({ value, onChange }: UserDirectorySearchProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search users by name or email..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10"
      />
    </div>
  );
}
