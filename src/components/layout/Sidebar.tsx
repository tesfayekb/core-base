
import React from 'react';
import { SidebarNavItem } from './SidebarNavItem';
import { Home, Shield, Layout, Puzzle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

export function Sidebar({ isOpen, toggleSidebar }: SidebarProps) {
  const menuItems = [
    { icon: Home, label: 'Dashboard', path: '/' },
    { icon: Shield, label: 'Validation', path: '/validation' },
    { icon: Layout, label: 'Components', path: '/components' },
    { icon: Puzzle, label: 'Integration', path: '/integration' },
  ];

  if (!isOpen) {
    return null;
  }

  return (
    <div className="h-full w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-6 border-b border-sidebar-border">
        <h1 className="text-lg font-semibold text-sidebar-foreground">Windsurf</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="md:hidden h-6 w-6"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {menuItems.map((item, index) => (
            <li key={index}>
              <SidebarNavItem item={item} onClose={() => {}} />
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
