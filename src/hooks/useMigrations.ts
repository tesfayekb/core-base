
import { useState, useEffect } from 'react';
import { migrationRunner } from '../services/migrations/migrationRunner';

export function useMigrations() {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const runMigrations = async () => {
    setIsRunning(true);
    setError(null);
    
    try {
      console.log('🏗️ Starting database migrations...');
      await migrationRunner.runMigrations();
      setIsComplete(true);
      console.log('✅ Database migrations completed successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Migration failed';
      setError(errorMessage);
      console.error('❌ Migration failed:', errorMessage);
    } finally {
      setIsRunning(false);
    }
  };

  // Auto-run migrations on hook initialization
  useEffect(() => {
    runMigrations();
  }, []);

  return {
    isRunning,
    error,
    isComplete,
    runMigrations
  };
}
