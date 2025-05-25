
import { useState, useEffect } from 'react';
import { migrationRunner } from '../services/migrations/migrationRunner';
import { databaseService } from '../services/database/databaseService';

export function useMigrations() {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'connected' | 'failed'>('testing');

  const runMigrations = async () => {
    setIsRunning(true);
    setError(null);
    setConnectionStatus('testing');
    
    try {
      console.log('🔗 Testing database connection...');
      
      // Test connection first
      const isConnected = await databaseService.testConnection();
      if (!isConnected) {
        throw new Error('Database connection failed. Please check your Supabase configuration.');
      }
      
      setConnectionStatus('connected');
      console.log('🏗️ Starting database migrations with Supabase...');
      
      await databaseService.initialize('migrations');
      
      setIsComplete(true);
      console.log('✅ Database migrations completed successfully with Supabase');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Migration failed';
      setError(errorMessage);
      setConnectionStatus('failed');
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
    connectionStatus,
    runMigrations
  };
}
