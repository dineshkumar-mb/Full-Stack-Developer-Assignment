import { z } from 'zod';

export const adminLoginSchema = z
  .object({
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .email('Please enter a valid email address')
      .transform((val) => val.toLowerCase().trim()),
    password: z
      .string({ required_error: 'Password is required' })
      .min(1, 'Password cannot be empty'),
  })
  .strict({ message: 'Unrecognized fields in login request' });

export const questionOptionSchema = z.object({
  optionId: z.enum(['A', 'B', 'C', 'D'], {
    errorMap: () => ({ message: 'Option ID must be A, B, C, or D' }),
  }),
  text: z
    .string({ required_error: 'Option text is required' })
    .trim()
    .min(1, 'Option text cannot be empty')
    .max(500, 'Option text cannot exceed 500 characters'),
});

const validateOptionCoverage = (options) => {
  if (!Array.isArray(options) || options.length !== 4) return false;
  const ids = options.map((opt) => opt.optionId);
  return ['A', 'B', 'C', 'D'].every((id) => ids.includes(id)) && ids.length === 4;
};

export const createQuestionSchema = z
  .object({
    questionText: z
      .string({ required_error: 'Question text is required' })
      .trim()
      .min(10, 'Question text must be at least 10 characters')
      .max(1000, 'Question text cannot exceed 1000 characters'),
    options: z
      .array(questionOptionSchema)
      .length(4, 'Exactly 4 options (A, B, C, D) are required')
      .refine(validateOptionCoverage, {
        message: 'Options must uniquely cover options A, B, C, and D',
      }),
    correctOption: z.enum(['A', 'B', 'C', 'D'], {
      errorMap: () => ({ message: 'Correct option must be A, B, C, or D' }),
    }),
    category: z.enum(['Quantitative', 'Logical Reasoning', 'Verbal'], {
      errorMap: () => ({ message: 'Category must be Quantitative, Logical Reasoning, or Verbal' }),
    }),
    difficulty: z.enum(['Easy', 'Medium', 'Hard'], {
      errorMap: () => ({ message: 'Difficulty must be Easy, Medium, or Hard' }),
    }),
    explanation: z
      .string()
      .trim()
      .max(2000, 'Explanation cannot exceed 2000 characters')
      .optional()
      .default(''),
    isActive: z.boolean().optional().default(false),
  })
  .strict({ message: 'Unrecognized fields in question creation request' })
  .refine(
    (data) => {
      const optionIds = data.options.map((o) => o.optionId);
      return optionIds.includes(data.correctOption);
    },
    {
      message: 'Correct option must match one of the provided options',
      path: ['correctOption'],
    }
  );

export const updateQuestionSchema = z
  .object({
    questionText: z
      .string()
      .trim()
      .min(10, 'Question text must be at least 10 characters')
      .max(1000, 'Question text cannot exceed 1000 characters')
      .optional(),
    options: z
      .array(questionOptionSchema)
      .length(4, 'Exactly 4 options (A, B, C, D) are required')
      .refine(validateOptionCoverage, {
        message: 'Options must uniquely cover options A, B, C, and D',
      })
      .optional(),
    correctOption: z.enum(['A', 'B', 'C', 'D']).optional(),
    category: z.enum(['Quantitative', 'Logical Reasoning', 'Verbal']).optional(),
    difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional(),
    explanation: z.string().trim().max(2000).optional(),
    isActive: z.boolean().optional(),
  })
  .strict({ message: 'Unrecognized fields in question update request' })
  .refine(
    (data) => {
      if (data.options && data.correctOption) {
        const optionIds = data.options.map((o) => o.optionId);
        return optionIds.includes(data.correctOption);
      }
      return true;
    },
    {
      message: 'Correct option must match one of the provided options',
      path: ['correctOption'],
    }
  );

export const updateQuestionStatusSchema = z
  .object({
    isActive: z.boolean({ required_error: 'isActive boolean flag is required' }),
    replacementQuestionId: z.string().optional(),
  })
  .strict({ message: 'Unrecognized fields in question status update' });

export const candidateQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  assessmentStatus: z.enum(['not_started', 'in_progress', 'completed', 'timed_out']).optional(),
  isPassed: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((val) => (typeof val === 'string' ? val === 'true' : val))
    .optional(),
  sortBy: z.enum(['createdAt', 'submittedAt', 'score', 'fullName', 'email']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const analyticsQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

export const updateSettingsSchema = z
  .object({
    testDurationMinutes: z
      .number({ invalid_type_error: 'Test duration must be a number' })
      .int('Test duration must be an integer')
      .min(5, 'Test duration must be at least 5 minutes')
      .max(180, 'Test duration cannot exceed 180 minutes')
      .optional(),
    passPercentage: z
      .number({ invalid_type_error: 'Pass percentage must be a number' })
      .min(0, 'Pass percentage cannot be negative')
      .max(100, 'Pass percentage cannot exceed 100%')
      .optional(),
    correctMarkWeight: z
      .number({ invalid_type_error: 'Correct mark weight must be a number' })
      .positive('Correct mark weight must be positive')
      .optional(),
    negativeMarkWeight: z
      .number({ invalid_type_error: 'Negative mark weight must be a number' })
      .min(0, 'Negative mark weight cannot be negative')
      .optional(),
    totalTestQuestions: z.literal(10, {
      errorMap: () => ({ message: 'Total test questions must remain 10 for this assessment' }),
    }).optional(),
  })
  .strict({ message: 'Unrecognized fields in settings update' });
