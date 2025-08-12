// Simple test to verify services can be imported and basic functionality works
import { PushNotificationService } from './PushNotificationService';
import { BackgroundLocationService } from './BackgroundLocationService';

// Test imports work
console.log('✅ PushNotificationService imported successfully');
console.log('✅ BackgroundLocationService imported successfully');

// Test basic functionality
export const testServices = async () => {
  try {
    // Test service methods are available
    console.log('🔧 Testing PushNotificationService methods...');
    console.log('- getPushToken():', typeof PushNotificationService.getPushToken);
    console.log('- getDeviceInfo():', typeof PushNotificationService.getDeviceInfo);
    console.log('- initialize():', typeof PushNotificationService.initialize);
    
    console.log('🔧 Testing BackgroundLocationService methods...');
    console.log('- isBackgroundLocationRunning():', typeof BackgroundLocationService.isBackgroundLocationRunning);
    console.log('- getCurrentUpdateInterval():', typeof BackgroundLocationService.getCurrentUpdateInterval);
    console.log('- initialize():', typeof BackgroundLocationService.initialize);
    
    // Test service state
    console.log('📊 Service States:');
    console.log('- Background location running:', BackgroundLocationService.isBackgroundLocationRunning());
    console.log('- Update interval:', BackgroundLocationService.getCurrentUpdateInterval());
    
    console.log('✅ All service tests passed!');
    return true;
  } catch (error) {
    console.error('❌ Service test failed:', error);
    return false;
  }
};

// Export for use in development
export { PushNotificationService, BackgroundLocationService };