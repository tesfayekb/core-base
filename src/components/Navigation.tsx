
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Shield, 
  Users, 
  Settings, 
  BarChart3,
  CheckSquare,
  GitBranch
} from 'lucide-react';

const Navigation = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/implementation', icon: CheckSquare, label: 'Implementation' },
    { path: '/security', icon: Shield, label: 'Security' },
    { path: '/rbac', icon: Users, label: 'RBAC' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/validation', icon: GitBranch, label: 'Validation' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex space-x-8">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
