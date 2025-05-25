
import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  name?: string;
  user_metadata?: {
    first_name?: string;
    last_name?: string;
    full_name?: string;
  };
}

interface AuthContextType {
  user: User | null;
  tenantId: string | null;
  login: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  logout: () => void;
  loading: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tenantId, setTenantId] = useState<string | null>('default-tenant');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate checking for existing session
    const checkAuth = async () => {
      try {
        // In a real app, this would check for existing session
        setIsLoading(false);
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    // Simulate login
    setUser({ 
      id: 'user-1', 
      email,
      user_metadata: {
        first_name: 'John',
        last_name: 'Doe',
        full_name: 'John Doe'
      }
    });
    setTenantId('tenant-1');
  };

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await login(email, password);
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Login failed' };
    }
  };

  const logout = () => {
    setUser(null);
    setTenantId(null);
  };

  const signOut = async () => {
    logout();
  };

  return (
    <AuthContext.Provider value={{
      user,
      tenantId,
      login,
      signIn,
      logout,
      signOut,
      isLoading,
      loading: isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
