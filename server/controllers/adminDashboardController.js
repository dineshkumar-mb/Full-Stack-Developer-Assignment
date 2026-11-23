import asyncHandler from '../utils/asyncHandler.js';
import adminDashboardService from '../services/adminDashboardService.js';

export const getSummary = asyncHandler(async (req, res) => {
  const summary = await adminDashboardService.getDashboardSummary();

  return res.status(200).json({
    success: true,
    summary,
  });
});

export const getAnalytics = asyncHandler(async (req, res) => {
  const analytics = await adminDashboardService.getDashboardAnalytics(req.query);

  return res.status(200).json({
    success: true,
    analytics,
  });
});

export default {
  getSummary,
  getAnalytics,
};
