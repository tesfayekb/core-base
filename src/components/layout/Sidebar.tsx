import React from 'react';
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { SidebarNavItem } from './SidebarNavItem';
import { 
  Home, 
  Shield, 
  Layout, 
  Puzzle, 
  Building2, 
  Users, 
  Settings, 
  FileCheck, 
  UserCog, 
  BarChart3,
  ScrollText,
  Database
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  isMobile: boolean;
}

export function Sidebar({ isOpen, toggleSidebar, isMobile }: SidebarProps) {
  const menuSections = [
    {
      title: 'Main',
      items: [
        { icon: Home, label: 'Dashboard', path: '/' },
        { icon: BarChart3, label: 'Analytics', path: '/analytics' },
      ]
    },
    {
      title: 'Management',
      items: [
        { icon: Users, label: 'Users', path: '/users' },
        { icon: Building2, label: 'Tenant Management', path: '/tenant-management' },
        { icon: UserCog, label: 'Roles & Permissions', path: '/roles' },
      ]
    },
    {
      title: 'System',
      items: [
        { icon: ScrollText, label: 'Audit Logs', path: '/audit' },
        { icon: Shield, label: 'Validation', path: '/validation' },
        { icon: Settings, label: 'Settings', path: '/settings' },
      ]
    },
    {
      title: 'Development',
      items: [
        { icon: Layout, label: 'Components', path: '/components' },
        { icon: Puzzle, label: 'Integration', path: '/integration' },
        { icon: Database, label: 'Migration Test', path: '/migration-test' },
      ]
    }
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
        <h1 className="text-lg font-semibold text-sidebar-foreground">Core Base</h1>
        <p className="text-xs text-muted-foreground mt-1">Enterprise Platform</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        {menuSections.map((section, sectionIndex) => (
          <div key={sectionIndex} className={sectionIndex > 0 ? 'mt-6' : ''}>
            <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {section.title}
            </h3>
            <ul className="space-y-1">
              {section.items.map((item, index) => (
                <li key={index}>
                  <SidebarNavItem item={item} onClose={handleClose} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );

  // Mobile sidebar using Sheet
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={toggleSidebar}>
        <SheetContent side="left" className="w-64 p-0 border-r">
          <VisuallyHidden>
            <SheetTitle>Navigation Menu</SheetTitle>
          </VisuallyHidden>
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
