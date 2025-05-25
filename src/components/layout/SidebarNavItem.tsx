
import React from 'react';
import { NavLink } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';

interface SidebarNavItemProps {
  item: {
    icon: LucideIcon;
    label: string;
    path: string;
  };
  onClose: () => void;
}

export function SidebarNavItem({ item, onClose }: SidebarNavItemProps) {
  const { icon: Icon, label, path } = item;

  return (
    <NavLink
      to={path}
      onClick={onClose}
      className={({ isActive }) =>
        `flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`
      }
    >
      <Icon className="mr-3 h-5 w-5" />
      {label}
    </NavLink>
  );
}
