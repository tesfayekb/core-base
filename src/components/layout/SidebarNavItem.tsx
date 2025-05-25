
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
        `flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors w-full ${
          isActive
            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
            : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
        }`
      }
    >
      <Icon className="mr-3 h-4 w-4 flex-shrink-0" />
      <span className="truncate">{label}</span>
    </NavLink>
  );
}
