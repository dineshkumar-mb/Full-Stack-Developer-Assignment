import asyncHandler from '../utils/asyncHandler.js';
import adminCandidateService from '../services/adminCandidateService.js';
import adminExportService from '../services/adminExportService.js';

export const listCandidates = asyncHandler(async (req, res) => {
  const result = await adminCandidateService.listCandidates(req.query);

  return res.status(200).json({
    success: true,
    candidates: result.data,
    pagination: result.pagination,
  });
});

export const getCandidateById = asyncHandler(async (req, res) => {
  const candidate = await adminCandidateService.getCandidateById(req.params.id);

  return res.status(200).json({
    success: true,
    candidate,
  });
});

export const getCandidateAssessment = asyncHandler(async (req, res) => {
  const assessment = await adminCandidateService.getCandidateAssessmentDetails(req.params.id);

  return res.status(200).json({
    success: true,
    assessment,
  });
});

export const exportCandidatesCsv = asyncHandler(async (req, res) => {
  const csvContent = await adminExportService.generateCandidatesCsv(req.query);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="candidates_export_${timestamp}.csv"`);

  return res.status(200).send(csvContent);
});

export const exportCandidatesExcel = asyncHandler(async (req, res) => {
  const excelContent = await adminExportService.generateCandidatesExcel(req.query);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="candidates_export_${timestamp}.xls"`);

  return res.status(200).send(excelContent);
});

export default {
  listCandidates,
  getCandidateById,
  getCandidateAssessment,
  exportCandidatesCsv,
  exportCandidatesExcel,
};
