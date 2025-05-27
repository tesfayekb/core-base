
import React from 'react';
import { MigrationTestRunner } from '../components/testing/MigrationTestRunner';

export function MigrationTestPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Migration Test</h2>
        <p className="text-muted-foreground">Test and validate database migration system</p>
      </div>
      
      <MigrationTestRunner />
    </div>
  );
}
