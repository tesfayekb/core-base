import { migrationRunner } from './src/services/migrations/migrationRunner.js';
import migration014 from './src/services/migrations/migrations/014_add_superadmin_user_creation.ts';

async function applyMigration() {
  try {
    console.log('🔄 Applying migration 014...');
    
    await migrationRunner.initialize();
    
    migrationRunner.addMigration(migration014.default);
    
    await migrationRunner.runMigration(migration014.default, 'devin_ai');
    
    console.log('✅ Migration 014 applied successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

applyMigration();
