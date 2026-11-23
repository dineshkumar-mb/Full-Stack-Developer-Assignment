import { Admin } from '../models/Admin.js';
import { hashPassword } from '../utils/generateToken.js';
import env from '../config/environment.js';

export const seedAdmin = async () => {
  try {
    const adminEmail = env.ADMIN_EMAIL;
    const adminName = env.ADMIN_NAME;
    const plainPassword = env.ADMIN_PASSWORD;

    if (!adminEmail || !plainPassword) {
      throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be defined to seed the admin account.');
    }

    const hashedPassword = await hashPassword(plainPassword, env.BCRYPT_SALT_ROUNDS);

    let admin = await Admin.findOne({ email: adminEmail });

    if (!admin) {
      admin = await Admin.create({
        name: adminName,
        email: adminEmail,
        passwordHash: hashedPassword,
        role: 'superadmin',
        isActive: true,
      });
      console.log(`[Seed:Admin] Created default admin account: ${admin.email}`);
    } else {
      admin.name = adminName;
      admin.passwordHash = hashedPassword;
      admin.isActive = true;
      await admin.save();
      console.log(`[Seed:Admin] Updated existing admin account: ${admin.email}`);
    }

    return admin;
  } catch (error) {
    console.error(`[Seed:Admin Error] Failed to seed admin: ${error.message}`);
    throw error;
  }
};

// Direct script execution
if (process.argv[1]?.endsWith('seedAdmin.js')) {
  import('../config/database.js').then(async ({ connectDB, disconnectDB }) => {
    try {
      await connectDB();
      await seedAdmin();
      await disconnectDB();
      process.exit(0);
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
}

export default seedAdmin;
