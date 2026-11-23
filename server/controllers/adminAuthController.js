import asyncHandler from '../utils/asyncHandler.js';
import adminAuthService from '../services/adminAuthService.js';

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await adminAuthService.loginAdmin(email, password);

  return res.status(200).json({
    success: true,
    message: 'Admin authentication successful',
    admin: result.admin,
    token: result.token,
  });
});

export const getMe = asyncHandler(async (req, res) => {
  const admin = await adminAuthService.getAdminProfile(req.user.id);

  return res.status(200).json({
    success: true,
    admin,
  });
});

export const logout = asyncHandler(async (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully. Please discard the authentication token on the client.',
  });
});

export default {
  login,
  getMe,
  logout,
};
