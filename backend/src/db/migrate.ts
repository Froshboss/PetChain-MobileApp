import fs from 'fs';
import path from 'path';
import { query, closePool } from './index';

async function migrate() {
  console.log('Starting database migrations...');
  
  try {
    const migrationFile = path.join(__dirname, '../../migrations/001_initial_schema.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');
    
    await query(sql);
    console.log('Migration 001_initial_schema.sql executed successfully.');
    
    console.log('All migrations completed.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await closePool();
  }
}

if (require.main === module) {
  migrate();
}

export { migrate };
