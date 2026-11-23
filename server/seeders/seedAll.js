import { connectDB, disconnectDB } from '../config/database.js';
import { seedAdmin } from './seedAdmin.js';
import { seedSettings } from './seedSettings.js';
import { seedQuestions } from './seedQuestions.js';

export const seedAll = async () => {
  console.log('--- [Seeder] Starting Database Seeding ---');
  try {
    await connectDB();

    console.log('[1/3] Seeding Admin Account...');
    await seedAdmin();

    console.log('[2/3] Seeding Global Settings...');
    await seedSettings();

    console.log('[3/3] Seeding Corporate Aptitude Questions...');
    await seedQuestions();

    console.log('--- [Seeder] All Seed Operations Completed Successfully ---');
  } catch (error) {
    console.error(`--- [Seeder Error] Seeding failed: ${error.message} ---`);
    throw error;
  }
};

// Direct script execution
if (process.argv[1]?.endsWith('seedAll.js')) {
  seedAll()
    .then(async () => {
      await disconnectDB();
      process.exit(0);
    })
    .catch(async (err) => {
      await disconnectDB();
      process.exit(1);
    });
}

export default seedAll;
