import 'dotenv/config';
import { 
  createUserLocation, 
  getUserLocations, 
  deleteUserData, 
  purgeOldUserLocations,
  getPrivacyAuditLog 
} from './privacy.js';
import { pool } from './db.js';

async function runTests() {
  console.log('Running privacy function tests...');
  
  try {
    // Test user ID for testing
    const testUserId = '123e4567-e89b-12d3-a456-426614174000';
    const testSessionId = '123e4567-e89b-12d3-a456-426614174001';
    
    console.log('\n1. Testing createUserLocation...');
    const locationId = await createUserLocation({
      userId: testUserId,
      sessionId: testSessionId,
      longitude: -122.4194,
      latitude: 37.7749,
      accuracy: 10,
      payload: { source: 'test' }
    });
    console.log(`✓ Created location with ID: ${locationId}`);
    
    console.log('\n2. Testing getUserLocations...');
    const locations = await getUserLocations({ userId: testUserId, limit: 10 });
    console.log(`✓ Retrieved ${locations.length} location(s) for user`);
    console.log('Sample location:', JSON.stringify(locations[0], null, 2));
    
    console.log('\n3. Testing privacy audit log...');
    const auditLogs = await getPrivacyAuditLog(5);
    console.log(`✓ Retrieved ${auditLogs.length} audit log entries`);
    if (auditLogs.length > 0) {
      console.log('Latest audit entry:', JSON.stringify(auditLogs[0], null, 2));
    }
    
    console.log('\n4. Testing location purge (will only delete very old data)...');
    const purgeCount = await purgeOldUserLocations(30);
    console.log(`✓ Purged ${purgeCount} old location records`);
    
    console.log('\n5. Testing user data deletion...');
    const deletionResult = await deleteUserData(testUserId);
    console.log(`✓ Deleted user data:`, deletionResult);
    
    console.log('\n6. Testing audit log after deletion...');
    const postDeleteionAuditLogs = await getPrivacyAuditLog(3, 'user_data_deletion');
    console.log(`✓ Retrieved ${postDeleteionAuditLogs.length} deletion audit entries`);
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}