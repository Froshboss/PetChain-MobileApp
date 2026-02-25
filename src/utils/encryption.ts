import CryptoJS from 'crypto-js';
import * as Keychain from 'react-native-keychain';

const ENCRYPTION_KEY = 'PETCHAIN_ENCRYPTION_KEY';

// Custom error types
export class EncryptionError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'EncryptionError';
  }
}

// Secure key storage
export const storeEncryptionKey = async (key: string): Promise<boolean> => {
  if (!key || typeof key !== 'string' || key.trim().length === 0) {
    throw new EncryptionError('Encryption key cannot be empty', 'INVALID_KEY');
  }
  
  try {
    await Keychain.setGenericPassword(ENCRYPTION_KEY, key);
    return true;
  } catch (error) {
    throw new EncryptionError(
      `Failed to store encryption key: ${error instanceof Error ? error.message : 'Unknown keychain error'}`,
      'KEYCHAIN_STORE_ERROR'
    );
  }
};

export const getEncryptionKey = async (): Promise<string> => {
  try {
    const credentials = await Keychain.getGenericPassword();
    if (!credentials) {
      throw new EncryptionError('No encryption key found in keychain', 'KEY_NOT_FOUND');
    }
    return credentials.password;
  } catch (error) {
    if (error instanceof EncryptionError) throw error;
    throw new EncryptionError(
      `Failed to retrieve encryption key: ${error instanceof Error ? error.message : 'Unknown keychain error'}`,
      'KEYCHAIN_RETRIEVE_ERROR'
    );
  }
};

// Encrypt function
export const encrypt = async (data: string): Promise<string> => {
  if (typeof data !== 'string') {
    throw new EncryptionError('Data to encrypt must be a string', 'INVALID_DATA_TYPE');
  }
  
  try {
    const key = await getEncryptionKey();
    const encrypted = CryptoJS.AES.encrypt(data, key).toString();
    if (!encrypted) {
      throw new EncryptionError('Encryption produced empty result', 'ENCRYPTION_FAILED');
    }
    return encrypted;
  } catch (error) {
    if (error instanceof EncryptionError) throw error;
    throw new EncryptionError(
      `Encryption failed: ${error instanceof Error ? error.message : 'Unknown crypto error'}`,
      'CRYPTO_ERROR'
    );
  }
};

// Decrypt function
export const decrypt = async (encryptedData: string): Promise<string> => {
  if (!encryptedData || typeof encryptedData !== 'string') {
    throw new EncryptionError('Encrypted data must be a non-empty string', 'INVALID_ENCRYPTED_DATA');
  }
  
  try {
    const key = await getEncryptionKey();
    const bytes = CryptoJS.AES.decrypt(encryptedData, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (!decrypted) {
      throw new EncryptionError('Decryption failed - invalid data or wrong key', 'DECRYPTION_FAILED');
    }
    return decrypted;
  } catch (error) {
    if (error instanceof EncryptionError) throw error;
    throw new EncryptionError(
      `Decryption failed: ${error instanceof Error ? error.message : 'Unknown crypto error'}`,
      'CRYPTO_ERROR'
    );
  }
};

// Hash function for passwords
export const hashPassword = (password: string): string => {
  if (!password || typeof password !== 'string') {
    throw new EncryptionError('Password must be a non-empty string', 'INVALID_PASSWORD');
  }
  
  try {
    const hash = CryptoJS.SHA256(password).toString();
    if (!hash) {
      throw new EncryptionError('Password hashing produced empty result', 'HASH_FAILED');
    }
    return hash;
  } catch (error) {
    if (error instanceof EncryptionError) throw error;
    throw new EncryptionError(
      `Password hashing failed: ${error instanceof Error ? error.message : 'Unknown crypto error'}`,
      'CRYPTO_ERROR'
    );
  }
};
