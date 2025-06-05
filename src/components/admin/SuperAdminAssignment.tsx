import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { assignSuperAdminRole, checkUserRoles } from '@/utils/roleAssignment';
import { supabase } from '@/services/database';

export function SuperAdminAssignment() {
  const [email, setEmail] = useState('bethany@bethany.com');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleAssignSuperAdmin = async () => {
    setIsLoading(true);
    setMessage('');

    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', email)
        .single();

      if (userError || !userData) {
        setMessage(`❌ User ${email} not found`);
        return;
      }

      const success = await assignSuperAdminRole(userData.id);
      
      if (success) {
        setMessage(`✅ Successfully assigned SuperAdmin role to ${email}`);
        
        const roles = await checkUserRoles(userData.id);
        console.log('Current roles for user:', roles);
      } else {
        setMessage(`❌ Failed to assign SuperAdmin role to ${email}`);
      }
    } catch (error) {
      console.error('Error in SuperAdmin assignment:', error);
      setMessage(`❌ Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>SuperAdmin Role Assignment</CardTitle>
        <CardDescription>
          Assign SuperAdmin role to a user for full system access
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Input
            type="email"
            placeholder="User email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <Button 
          onClick={handleAssignSuperAdmin}
          disabled={isLoading || !email}
          className="w-full"
        >
          {isLoading ? 'Assigning...' : 'Assign SuperAdmin Role'}
        </Button>
        {message && (
          <div className={`text-sm p-2 rounded ${
            message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {message}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
