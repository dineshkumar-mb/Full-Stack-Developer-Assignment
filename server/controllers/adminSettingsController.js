import asyncHandler from '../utils/asyncHandler.js';
import adminSettingsService from '../services/adminSettingsService.js';

export const getSettings = asyncHandler(async (req, res) => {
  const settings = await adminSettingsService.getSettings();

  return res.status(200).json({
    success: true,
    settings,
  });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const settings = await adminSettingsService.updateSettings(req.body, req.user.id);

  return res.status(200).json({
    success: true,
    message: 'Assessment settings updated successfully',
    settings,
  });
});

export default {
  getSettings,
  updateSettings,
};
