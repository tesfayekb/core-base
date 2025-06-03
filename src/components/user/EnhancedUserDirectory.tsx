
import React from 'react';
import { UserDirectory } from './UserDirectory';

export function EnhancedUserDirectory() {
  console.log('🎯 EnhancedUserDirectory rendering - should only see this once');
  
  return <UserDirectory />;
}
