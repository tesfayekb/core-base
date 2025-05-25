
import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { useIsMobile } from "@/hooks/use-mobile";

export function MainLayout() {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <div className={`
          ${sidebarOpen ? 'w-64' : 'w-0'} 
          transition-all duration-300 ease-in-out 
          h-screen overflow-hidden
        `}>
          <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} isMobile={isMobile} />
        </div>
      )}

      {/* Mobile Sidebar */}
      {isMobile && (
        <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} isMobile={isMobile} />
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header toggleSidebar={toggleSidebar} />
        <main className="flex-1 container mx-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
