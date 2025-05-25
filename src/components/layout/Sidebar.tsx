
import React from 'react';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu } from 'lucide-react';
import { SidebarNavItem } from './SidebarNavItem';
import { Home, Shield, Layout, Puzzle } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

export function Sidebar({ isOpen, toggleSidebar }: SidebarProps) {
  const handleClose = () => {
    toggleSidebar();
  };

  const menuItems = [
    { icon: Home, label: 'Dashboard', path: '/' },
    { icon: Shield, label: 'Validation', path: '/validation' },
    { icon: Layout, label: 'Components', path: '/components' },
    { icon: Puzzle, label: 'Integration', path: '/integration' },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={toggleSidebar}>
      <SheetTrigger asChild>
        <Menu className="md:hidden h-6 w-6" onClick={toggleSidebar} />
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0 border-r">
        <div className="flex flex-col h-full">
          <div className="px-4 py-6">
            <h1 className="text-lg font-semibold">Windsurf</h1>
          </div>
          <nav className="flex-1">
            <ul className="space-y-1">
              {menuItems.map((item, index) => (
                <li key={index}>
                  <SidebarNavItem item={item} onClose={handleClose} />
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}
