import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../context/AuthContext.jsx';
import candidateService from '../../services/candidateService.js';
import Input from '../../components/common/Input.jsx';
import Select from '../../components/common/Select.jsx';
import Button from '../../components/common/Button.jsx';
import Alert from '../../components/common/Alert.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/common/Card.jsx';
import { Award, UserCheck, ArrowRight, ShieldCheck } from 'lucide-react';

const qualificationOptions = [
  { value: 'High School', label: 'High School' },
  { value: 'Diploma', label: 'Diploma' },
  { value: "Bachelor's Degree", label: "Bachelor's Degree" },
  { value: "Master's Degree", label: "Master's Degree" },
  { value: 'Doctorate', label: 'Doctorate' },
  { value: 'Other', label: 'Other' },
];

const genderOptions = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Non-Binary', label: 'Non-Binary' },
  { value: 'Prefer not to say', label: 'Prefer not to say' },
  { value: 'Other', label: 'Other' },
];

const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(50, 'Full name cannot exceed 50 characters')
    .regex(/^[A-Za-z\s]+$/, 'Full name must contain only letters and spaces'),
  email: z
    .string()
    .trim()
    .email('Please enter a valid email address')
    .transform((v) => v.toLowerCase().trim()),
  age: z.coerce
    .number({ invalid_type_error: 'Age must be a number' })
    .int('Age must be an integer')
    .min(18, 'Candidate must be at least 18 years old')
    .max(60, 'Candidate age cannot exceed 60 years'),
  phoneNumber: z
    .string()
    .trim()
    .regex(/^[0-9]{10}$/, 'Phone number must be exactly 10 digits'),
  highestQualification: z
    .string()
    .min(1, 'Please select your highest qualification'),
  gender: z.string().optional().default(''),
  city: z.string().trim().max(50, 'City cannot exceed 50 characters').optional().default(''),
});

export function RegisterPage() {
  const navigate = useNavigate();
  const { loginCandidate } = useAuth();
  const [serverError, setServerError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      age: '',
      phoneNumber: '',
      highestQualification: '',
      gender: '',
      city: '',
    },
  });

  const onSubmit = async (data) => {
    setServerError(null);
    setIsSubmitting(true);
    try {
      const response = await candidateService.register(data);
      const { token, candidate } = response.data;
      loginCandidate(token, candidate);

      // If the candidate already completed the assessment previously, route straight to result
      if (candidate.hasAttempted) {
        navigate('/result');
      } else {
        navigate('/instructions');
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Registration failed. Please verify your details and try again.';
      setServerError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto w-full">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200 mb-4">
          <Award className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Candidate Registration
        </h1>
        <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
          Welcome to the Aptitude Assessment. Please enter your accurate details below to begin your timed evaluation.
        </p>
      </div>

      <Card className="border-slate-200 shadow-md">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-indigo-600" />
            Candidate Information
          </CardTitle>
          <CardDescription>
            All fields marked with an asterisk (<span className="text-rose-500">*</span>) are mandatory.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {serverError && (
            <Alert
              variant="error"
              title="Registration Error"
              className="mb-6"
              onClose={() => setServerError(null)}
            >
              {serverError}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-5" noValidate>
            <Input
              id="fullName"
              label="Full Name"
              placeholder="e.g. Jane Doe"
              required
              error={errors.fullName?.message}
              {...register('fullName')}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                id="email"
                type="email"
                label="Email Address"
                placeholder="jane.doe@example.com"
                required
                error={errors.email?.message}
                {...register('email')}
              />

              <Input
                id="phoneNumber"
                type="tel"
                label="Phone Number"
                placeholder="10 digit mobile number"
                required
                maxLength={10}
                error={errors.phoneNumber?.message}
                {...register('phoneNumber')}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                id="age"
                type="number"
                label="Age (Years)"
                placeholder="e.g. 24"
                required
                min={18}
                max={60}
                error={errors.age?.message}
                {...register('age')}
              />

              <Select
                id="gender"
                label="Gender"
                placeholder="Select Gender"
                options={genderOptions}
                error={errors.gender?.message}
                {...register('gender')}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                id="highestQualification"
                label="Highest Qualification"
                placeholder="Select Qualification"
                required
                options={qualificationOptions}
                error={errors.highestQualification?.message}
                {...register('highestQualification')}
              />

              <Input
                id="city"
                label="City / Location"
                placeholder="e.g. Mumbai, New York"
                error={errors.city?.message}
                {...register('city')}
              />
            </div>

            <div className="pt-3">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Your session is securely tracked and resume-safe. In the event of network disruption, you can re-enter your registered email.
                </span>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
                className="w-full"
              >
                Proceed to Instructions
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default RegisterPage;
