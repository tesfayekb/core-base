
import React from 'react';
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { SidebarNavItem } from './SidebarNavItem';
import { Home, Shield, Layout, Puzzle } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  isMobile: boolean;
}

export function Sidebar({ isOpen, toggleSidebar, isMobile }: SidebarProps) {
  const menuItems = [
    { icon: Home, label: 'Dashboard', path: '/' },
    { icon: Shield, label: 'Validation', path: '/validation' },
    { icon: Layout, label: 'Components', path: '/components' },
    { icon: Puzzle, label: 'Integration', path: '/integration' },
  ];

  const handleClose = () => {
    if (isMobile) {
      toggleSidebar();
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-sidebar">
      {/* Header */}
      <div className="px-6 py-6 border-b border-sidebar-border">
        <h1 className="text-lg font-semibold text-sidebar-foreground">Windsurf</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {menuItems.map((item, index) => (
            <li key={index}>
              <SidebarNavItem item={item} onClose={handleClose} />
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );

  // Mobile sidebar using Sheet
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={toggleSidebar}>
        <SheetContent side="left" className="w-64 p-0 border-r">
          {sidebarContent}
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop sidebar
  if (!isOpen) {
    return null;
  }

  return (
    <div className="w-64 h-full border-r border-sidebar-border">
      {sidebarContent}
    </div>
  );
}
