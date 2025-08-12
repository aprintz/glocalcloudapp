#!/usr/bin/env tsx
/**
 * Test script for geofence catch-up evaluation
 */
import 'dotenv/config';
import { GeofenceEvaluationService } from '../server/src/geofence-service.js';
import { pool, query } from '../server/src/db.js';

async function runTest() {
  console.log('🧪 Testing Geofence Catch-up Evaluation');
  
  try {
    // Test database connection
    console.log('📡 Testing database connection...');
    const pingResult = await query('SELECT 1 as ok');
    console.log('✅ Database connection successful');

    // Check if tables exist
    console.log('🔍 Checking database schema...');
    const tablesResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('geofences', 'user_locations', 'geofence_hits')
    `);
    
    const existingTables = tablesResult.rows.map(row => row.table_name);
    console.log('📋 Existing tables:', existingTables);

    if (existingTables.length === 0) {
      console.log('⚠️  No geofence tables found. Please run migrations first.');
      console.log('💡 To run migrations: cd server && npm run migrate');
      return;
    }

    // Create test service
    console.log('🏗️  Creating GeofenceEvaluationService...');
    const service = new GeofenceEvaluationService({
      batchSize: 10,
      lookbackMinutes: 60,
      logSpecId: 'F-003-TEST'
    });

    // Run a test evaluation
    console.log('🚀 Running test geofence evaluation...');
    await service.runCatchupEvaluation();
    
    console.log('✅ Test completed successfully');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runTest();