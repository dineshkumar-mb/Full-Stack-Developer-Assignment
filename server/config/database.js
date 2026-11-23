import mongoose from 'mongoose';
import env from './environment.js';

let isConnected = false;

export const connectDB = async (customUri = null) => {
  const uri = customUri || env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables.');
  }

  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true,
    });

    isConnected = true;
    console.log(`[Database] MongoDB Connected: ${conn.connection.host || 'in-memory'}`);

    mongoose.connection.on('error', (err) => {
      console.error(`[Database Error] Connection error: ${err.message}`);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[Database] MongoDB disconnected');
      isConnected = false;
    });

    return conn;
  } catch (error) {
    isConnected = false;
    console.error(`[Database Error] Initial connection failed: ${error.message}`);
    throw error;
  }
};

export const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    console.log('[Database] MongoDB disconnected gracefully');
  }
};

export const getDBStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return states[mongoose.connection.readyState] || 'disconnected';
};

export default {
  connectDB,
  disconnectDB,
  getDBStatus,
};
