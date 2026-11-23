import asyncHandler from '../utils/asyncHandler.js';
import adminQuestionService from '../services/adminQuestionService.js';

export const listQuestions = asyncHandler(async (req, res) => {
  const result = await adminQuestionService.listQuestions(req.query);

  return res.status(200).json({
    success: true,
    questions: result.data,
    pagination: result.pagination,
  });
});

export const getQuestionById = asyncHandler(async (req, res) => {
  const question = await adminQuestionService.getQuestionById(req.params.id);

  return res.status(200).json({
    success: true,
    question,
  });
});

export const createQuestion = asyncHandler(async (req, res) => {
  const question = await adminQuestionService.createQuestion(req.body);

  return res.status(201).json({
    success: true,
    message: 'Question created successfully',
    question,
  });
});

export const updateQuestion = asyncHandler(async (req, res) => {
  const question = await adminQuestionService.updateQuestion(req.params.id, req.body);

  return res.status(200).json({
    success: true,
    message: 'Question updated successfully',
    question,
  });
});

export const updateQuestionStatus = asyncHandler(async (req, res) => {
  const { isActive, replacementQuestionId } = req.body;
  const question = await adminQuestionService.updateQuestionStatus(
    req.params.id,
    isActive,
    replacementQuestionId
  );

  return res.status(200).json({
    success: true,
    message: `Question ${isActive ? 'activated' : 'deactivated'} successfully`,
    question,
  });
});

export const deleteQuestion = asyncHandler(async (req, res) => {
  const result = await adminQuestionService.deleteQuestion(req.params.id);

  return res.status(200).json({
    success: true,
    message: result.message,
  });
});

export default {
  listQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  updateQuestionStatus,
  deleteQuestion,
};
