const { z } = require('zod');

// Device registration validation schema
const deviceRegistrationSchema = z.object({
  deviceToken: z.string().min(1, 'Device token is required'),
  deviceId: z.string().min(1, 'Device ID is required'),
  platform: z.enum(['ios', 'android'], {
    required_error: 'Platform must be ios or android',
  }),
  suffix: z.string().optional(),
  userId: z.number().positive('User ID must be a positive number').optional(),
});

module.exports = {
  deviceRegistrationSchema,
};