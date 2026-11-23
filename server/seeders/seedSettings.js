import { Settings } from '../models/Settings.js';

export const seedSettings = async () => {
  try {
    let settings = await Settings.findOne({ singletonKey: 'GLOBAL_SETTINGS' });

    if (!settings) {
      settings = await Settings.create({
        singletonKey: 'GLOBAL_SETTINGS',
        testDurationMinutes: 15,
        passPercentage: 60,
        correctMarkWeight: 2,
        negativeMarkWeight: 1,
        totalTestQuestions: 10,
      });
      console.log('[Seed:Settings] Default settings created successfully (15m, 60% pass, +2/-1 marking)');
    } else {
      console.log('[Seed:Settings] Existing settings verified.');
    }

    return settings;
  } catch (error) {
    console.error(`[Seed:Settings Error] Failed to seed settings: ${error.message}`);
    throw error;
  }
};

// Direct script execution
if (process.argv[1]?.endsWith('seedSettings.js')) {
  import('../config/database.js').then(async ({ connectDB, disconnectDB }) => {
    try {
      await connectDB();
      await seedSettings();
      await disconnectDB();
      process.exit(0);
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
}

export default seedSettings;
