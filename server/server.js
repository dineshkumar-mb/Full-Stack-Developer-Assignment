import app from './app.js';
import env from './config/environment.js';
import { connectDB, disconnectDB } from './config/database.js';

let server;

const startServer = async () => {
  try {
    // Connect to database before starting server
    await connectDB();

    server = app.listen(env.PORT, () => {
      console.log(`[Server] Aptitude Assessment API running on port ${env.PORT} in ${env.NODE_ENV} mode`);
      console.log(`[Server] Health check available at: http://localhost:${env.PORT}/api/health`);
    });

    // Graceful shutdown handlers
    const handleShutdown = async (signal) => {
      console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
      if (server) {
        server.close(async () => {
          console.log('[Server] HTTP server closed');
          await disconnectDB();
          process.exit(0);
        });
      } else {
        await disconnectDB();
        process.exit(0);
      }
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
  } catch (error) {
    console.error(`[Server Fatal] Failed to start application: ${error.message}`);
    process.exit(1);
  }
};

// Start listening if not in test mode
if (!env.isTest) {
  startServer();
}

export default app;
