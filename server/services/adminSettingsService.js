import { Settings } from '../models/Settings.js';
import ApiError from '../utils/ApiError.js';

/**
 * Retrieves the global assessment settings.
 */
export async function getSettings() {
  return Settings.getSettings();
}

/**
 * Updates assessment settings while preserving historical attempt snapshots.
 */
export async function updateSettings(updates, adminId) {
  const settings = await Settings.getSettings();

  if (updates.testDurationMinutes !== undefined) {
    settings.testDurationMinutes = updates.testDurationMinutes;
  }

  if (updates.passPercentage !== undefined) {
    settings.passPercentage = updates.passPercentage;
  }

  if (updates.correctMarkWeight !== undefined) {
    settings.correctMarkWeight = updates.correctMarkWeight;
  }

  if (updates.negativeMarkWeight !== undefined) {
    settings.negativeMarkWeight = updates.negativeMarkWeight;
  }

  if (updates.totalTestQuestions !== undefined) {
    if (updates.totalTestQuestions !== 10) {
      throw ApiError.badRequest('Total test questions must remain 10 for this assessment platform.');
    }
    settings.totalTestQuestions = 10;
  }

  settings.updatedBy = adminId;
  await settings.save();

  return settings;
}

export default {
  getSettings,
  updateSettings,
};
