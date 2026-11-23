import app from '../server/app.js';
import { connectDB } from '../server/config/database.js';

let isDbConnected = false;

export default async function handler(req, res) {
  // Ensure database is connected for serverless invocations
  if (!isDbConnected) {
    try {
      await connectDB();
      isDbConnected = true;
    } catch (error) {
      console.error('[Vercel Serverless] MongoDB connection error:', error.message);
      // Still forward request so Express error middleware can handle it
    }
  }

  return app(req, res);
}
