const crypto = require('crypto');
const CryptoJS = require('crypto-js');

class TokenHasher {
  static HASH_ALGORITHM = 'sha256';
  static ENCRYPTION_KEY = process.env.PUSH_TOKEN_ENCRYPTION_KEY;

  /**
   * Hash a device token using SHA-256
   */
  static hashToken(token) {
    return crypto.createHash(this.HASH_ALGORITHM).update(token).digest('hex');
  }

  /**
   * Optionally encrypt a device token before hashing
   */
  static encryptAndHashToken(token) {
    if (!this.ENCRYPTION_KEY) {
      console.warn('[F-001] No encryption key provided, using hash only');
      return this.hashToken(token);
    }

    try {
      const encrypted = CryptoJS.AES.encrypt(token, this.ENCRYPTION_KEY).toString();
      return this.hashToken(encrypted);
    } catch (error) {
      console.error('[F-001] Token encryption failed, falling back to hash only', error);
      return this.hashToken(token);
    }
  }
}

module.exports = {
  TokenHasher,
};