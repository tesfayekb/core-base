
import { useAuth } from "./AuthProvider";
import { LoginForm } from "./LoginForm";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  console.log('🛡️ AuthGuard - User:', !!user, 'Loading:', loading);

  if (loading) {
    console.log('🔄 AuthGuard showing loading spinner');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    console.log('🔐 AuthGuard showing login form');
    return <LoginForm />;
  }

  console.log('✅ AuthGuard allowing access to protected content');
  return <>{children}</>;
}
