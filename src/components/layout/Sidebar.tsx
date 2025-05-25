import React from 'react';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu } from 'lucide-react';
import { SidebarNavItem } from './SidebarNavItem';
import { Home, Shield, Layout } from 'lucide-react';

export function Sidebar() {
  const [open, setOpen] = React.useState(false);

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const menuItems = [
    { icon: Home, label: 'Dashboard', path: '/' },
    { icon: Shield, label: 'Validation', path: '/validation' },
    { icon: Layout, label: 'Components', path: '/components' },
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Menu className="md:hidden h-6 w-6" onClick={handleOpen} />
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
