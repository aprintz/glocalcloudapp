import crypto from 'crypto';
import { Core } from '@strapi/strapi';

export interface PushRegistration {
  id: string;
  userId: string;
  deviceToken: string;
  platform: 'ios' | 'android' | 'web';
  encryptedToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
  sound?: string;
}

export interface PushService {
  register(userId: string, deviceToken: string, platform: string): Promise<PushRegistration>;
  encrypt(token: string): Promise<string>;
  decrypt(encryptedToken: string): Promise<string>;
  sendToDevice(deviceToken: string, message: PushMessage): Promise<boolean>;
  sendToUser(userId: string, message: PushMessage): Promise<number>;
  sendToHub(hubId: string, message: PushMessage): Promise<number>;
  hashToken(token: string): string;
  validateRegistration(registration: PushRegistration): boolean;
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async register(userId: string, deviceToken: string, platform: string): Promise<PushRegistration> {
    // Feature spec: PUSH-REG-001 - User device registration
    const hashedToken = this.hashToken(deviceToken);
    const encryptedToken = await this.encrypt(deviceToken);
    
    const registration: PushRegistration = {
      id: crypto.randomUUID(),
      userId,
      deviceToken: hashedToken,
      platform: platform as 'ios' | 'android' | 'web',
      encryptedToken,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Store in database
    await strapi.db.query('plugin::push.registration').create({
      data: registration
    });

    return registration;
  },

  async encrypt(token: string): Promise<string> {
    // Feature spec: PUSH-ENC-001 - Token encryption
    const algorithm = 'aes-256-gcm';
    const keyString = strapi.config.get('push.encryptionKey') as string;
    const key = Buffer.from(keyString, 'hex');
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key);
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return `${iv.toString('hex')}:${encrypted}`;
  },

  async decrypt(encryptedToken: string): Promise<string> {
    // Feature spec: PUSH-ENC-002 - Token decryption
    const [ivHex, encrypted] = encryptedToken.split(':');
    const algorithm = 'aes-256-gcm';
    const keyString = strapi.config.get('push.encryptionKey') as string;
    const key = Buffer.from(keyString, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    
    const decipher = crypto.createDecipher(algorithm, key);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  },

  async sendToDevice(deviceToken: string, message: PushMessage): Promise<boolean> {
    // Feature spec: PUSH-SEND-001 - Send to individual device
    try {
      // Implementation would call actual push notification service
      strapi.log.info(`Sending push to device: ${deviceToken}`, message);
      return true;
    } catch (error) {
      strapi.log.error('Failed to send push notification', error);
      return false;
    }
  },

  async sendToUser(userId: string, message: PushMessage): Promise<number> {
    // Feature spec: PUSH-SEND-002 - Send to all user devices
    const registrations = await strapi.db.query('plugin::push.registration').findMany({
      where: { userId }
    });

    let successCount = 0;
    for (const registration of registrations) {
      const success = await this.sendToDevice(registration.deviceToken, message);
      if (success) successCount++;
    }

    return successCount;
  },

  async sendToHub(hubId: string, message: PushMessage): Promise<number> {
    // Feature spec: PUSH-HUB-001 - Send to hub subscribers
    const hubUsers = await strapi.db.query('plugin::geolocation.hub-user').findMany({
      where: { hubId }
    });

    let successCount = 0;
    for (const hubUser of hubUsers) {
      const sent = await this.sendToUser(hubUser.userId, message);
      successCount += sent;
    }

    return successCount;
  },

  hashToken(token: string): string {
    // Feature spec: PUSH-HASH-001 - Token hashing for storage
    return crypto.createHash('sha256').update(token).digest('hex');
  },

  validateRegistration(registration: PushRegistration): boolean {
    // Feature spec: PUSH-VAL-001 - Registration validation
    return !!(
      registration.id &&
      registration.userId &&
      registration.deviceToken &&
      ['ios', 'android', 'web'].includes(registration.platform)
    );
  }
});