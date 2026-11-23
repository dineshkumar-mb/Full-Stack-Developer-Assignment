import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

const requiredEnvVars = ['JWT_SECRET'];

// Check required variables
for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    console.error(`[FATAL] Missing mandatory environment variable: ${varName}`);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
  }
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/aptitude_assessment',
  JWT_SECRET: process.env.JWT_SECRET || 'fallback_secret_for_tests_only',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
  ADMIN_NAME: process.env.ADMIN_NAME || 'Assessment Administrator',
  ADMIN_EMAIL: (process.env.ADMIN_EMAIL || 'admin@assessment.com').toLowerCase().trim(),
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'AdminPassword123!',
  BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12,
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
};

export default env;
