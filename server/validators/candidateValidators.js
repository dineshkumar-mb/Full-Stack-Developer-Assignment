import { z } from 'zod';

const validGenders = ['Male', 'Female', 'Non-Binary', 'Prefer not to say', 'Other', ''];
const validQualifications = ['High School', 'Diploma', "Bachelor's Degree", "Master's Degree", 'Doctorate', 'Other'];

export const registerCandidateSchema = z
  .object({
    fullName: z
      .string({ required_error: 'Full name is required' })
      .trim()
      .min(2, 'Full name must be at least 2 characters')
      .max(50, 'Full name cannot exceed 50 characters')
      .regex(/^[A-Za-z\s]+$/, 'Full name must contain only letters and spaces'),
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .email('Please enter a valid email address')
      .transform((val) => val.toLowerCase().trim()),
    age: z.coerce
      .number({ required_error: 'Age is required' })
      .int('Age must be an integer')
      .min(18, 'Candidate must be at least 18 years old')
      .max(60, 'Candidate age cannot exceed 60 years'),
    phone: z
      .string()
      .trim()
      .regex(/^[0-9]{10}$/, 'Phone number must be exactly 10 digits')
      .optional(),
    phoneNumber: z
      .string()
      .trim()
      .regex(/^[0-9]{10}$/, 'Phone number must be exactly 10 digits')
      .optional(),
    gender: z
      .string()
      .optional()
      .default('')
      .refine((val) => validGenders.includes(val), {
        message: 'Invalid gender selection',
      }),
    qualification: z
      .string()
      .optional()
      .refine((val) => !val || validQualifications.includes(val), {
        message: 'Invalid qualification selected',
      }),
    highestQualification: z
      .string()
      .optional()
      .refine((val) => !val || validQualifications.includes(val), {
        message: 'Invalid qualification selected',
      }),
    city: z
      .string()
      .max(50, 'City cannot exceed 50 characters')
      .optional()
      .default(''),
  })
  .refine((data) => Boolean(data.phone || data.phoneNumber), {
    message: 'Phone number is required (exactly 10 digits)',
    path: ['phone'],
  })
  .refine((data) => Boolean(data.qualification || data.highestQualification), {
    message: 'Highest qualification is required',
    path: ['qualification'],
  });

export const updateAnswerSchema = z
  .object({
    selectedOption: z
      .enum(['A', 'B', 'C', 'D'])
      .nullable()
      .optional(),
    isMarkedForReview: z.boolean().optional(),
    sequence: z.number().int().positive().optional(),
  })
  .refine((data) => data.selectedOption !== undefined || data.isMarkedForReview !== undefined, {
    message: 'Either selectedOption or isMarkedForReview must be provided',
  });

export default {
  registerCandidateSchema,
  updateAnswerSchema,
};
