
import React from 'react';
import { useAuth } from './AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { LogOut, Mail, Calendar } from 'lucide-react';

export function UserProfile() {
  const { user, signOut } = useAuth();

  if (!user) return null;

  const userMetadata = user.user_metadata || {};
  const fullName = userMetadata.full_name || 
    `${userMetadata.first_name || ''} ${userMetadata.last_name || ''}`.trim() ||
    'User';
  
  const initials = fullName
    .split(' ')
    .map(name => name.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Signout error:', error);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <Avatar className="h-20 w-20">
            <AvatarFallback className="text-lg font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
        <CardTitle className="text-xl">{fullName}</CardTitle>
        <CardDescription className="flex items-center justify-center gap-2">
          <Mail className="h-4 w-4" />
          {user.email}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Account Status</span>
          <Badge variant={user.email_confirmed_at ? 'default' : 'secondary'}>
            {user.email_confirmed_at ? 'Verified' : 'Unverified'}
          </Badge>
        </div>
        
        {user.created_at && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Member Since</span>
            <span className="text-sm flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(user.created_at)}
            </span>
          </div>
        )}

        {user.last_sign_in_at && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Last Sign In</span>
            <span className="text-sm">
              {formatDate(user.last_sign_in_at)}
            </span>
          </div>
        )}

        <div className="pt-4 border-t">
          <Button 
            onClick={handleSignOut}
            variant="outline" 
            className="w-full"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
