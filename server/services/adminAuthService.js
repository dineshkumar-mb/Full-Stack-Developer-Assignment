import { Admin } from '../models/Admin.js';
import { generateToken } from '../utils/generateToken.js';
import ApiError from '../utils/ApiError.js';

/**
 * Authenticates an administrator with credentials.
 */
export async function loginAdmin(email, password) {
  const normalizedEmail = email.toLowerCase().trim();

  const admin = await Admin.findOne({ email: normalizedEmail });
  if (!admin) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  if (!admin.isActive) {
    throw ApiError.forbidden('Admin account has been deactivated. Please contact support.');
  }

  const isMatch = await admin.comparePassword(password);
  if (!isMatch) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  // Update last login timestamp
  admin.lastLogin = new Date();
  await admin.save();

  const token = generateToken({
    id: admin._id.toString(),
    email: admin.email,
    role: admin.role,
    name: admin.name,
  });

  return {
    admin: {
      id: admin._id.toString(),
      name: admin.name,
      email: admin.email,
      role: admin.role,
      lastLogin: admin.lastLogin,
    },
    token,
  };
}

/**
 * Retrieves the authenticated administrator's safe profile.
 */
export async function getAdminProfile(adminId) {
  const admin = await Admin.findById(adminId);
  if (!admin) {
    throw ApiError.notFound('Admin profile not found');
  }

  if (!admin.isActive) {
    throw ApiError.forbidden('Admin account has been deactivated');
  }

  return {
    id: admin._id.toString(),
    name: admin.name,
    email: admin.email,
    role: admin.role,
    lastLogin: admin.lastLogin,
    createdAt: admin.createdAt,
  };
}

export default {
  loginAdmin,
  getAdminProfile,
};
