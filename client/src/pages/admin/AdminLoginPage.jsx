import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../context/AuthContext.jsx';
import adminService from '../../services/adminService.js';
import Input from '../../components/common/Input.jsx';
import Button from '../../components/common/Button.jsx';
import Alert from '../../components/common/Alert.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/common/Card.jsx';
import { Shield, Lock, ArrowRight, KeyRound, ArrowLeft } from 'lucide-react';

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginAdmin } = useAuth();
  const [serverError, setServerError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleAutofill = () => {
    setValue('email', 'admin@assessment.com', { shouldValidate: true });
    setValue('password', 'AdminPassword123!', { shouldValidate: true });
    setServerError(null);
  };

  const onSubmit = async (data) => {
    setServerError(null);
    setIsSubmitting(true);
    try {
      const response = await adminService.login(data);
      const { token, admin } = response.data;
      loginAdmin(token, admin);

      const from = location.state?.from?.pathname || '/admin/dashboard';
      navigate(from, { replace: true });
    } catch (err) {
      const message =
        err.response?.data?.message ||
        (err.response?.status === 404
          ? 'API endpoint not found. Please verify the backend server is running the latest build.'
          : err.message === 'Network Error' || !err.response
          ? 'Cannot connect to backend server. Please verify the backend is running on port 5000.'
          : 'Invalid administrative credentials. Please verify your email and password.');
      setServerError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md">
        {/* Header matching Candidate Portal styling */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200 mb-4">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Admin Portal
          </h1>
          <p className="mt-2 text-sm text-slate-600 max-w-sm mx-auto">
            Aptitude Assessment Platform Management & Analytics
          </p>
        </div>

        {/* Demo Credentials Box */}
        <div className="mb-5 p-4 bg-indigo-50/80 border border-indigo-200/80 rounded-xl shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
              Demo Administrator Credentials
            </span>
            <button
              type="button"
              onClick={handleAutofill}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline cursor-pointer transition-colors"
            >
              Auto-fill Credentials
            </button>
          </div>
          <div className="space-y-1.5 text-xs text-slate-700 bg-white/90 p-2.5 rounded-lg border border-indigo-100">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Admin Email:</span>
              <code className="font-mono font-semibold text-slate-900 select-all bg-slate-100 px-1.5 py-0.5 rounded">
                admin@assessment.com
              </code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Password:</span>
              <code className="font-mono font-semibold text-slate-900 select-all bg-slate-100 px-1.5 py-0.5 rounded">
                AdminPassword123!
              </code>
            </div>
          </div>
        </div>

        <Card className="border-slate-200 bg-white shadow-md">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-slate-900">
              <Lock className="w-5 h-5 text-indigo-600" />
              Sign In to Your Account
            </CardTitle>
            <CardDescription className="text-slate-500">
              Enter your authorized administrative email and password.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {serverError && (
              <Alert
                variant="error"
                title="Authentication Failed"
                className="mb-5"
                onClose={() => setServerError(null)}
              >
                {serverError}
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <Input
                id="email"
                type="email"
                label="Admin Email"
                placeholder="admin@assessment.com"
                required
                error={errors.email?.message}
                {...register('email')}
              />

              <Input
                id="password"
                type="password"
                label="Password"
                placeholder="••••••••••••"
                required
                error={errors.password?.message}
                {...register('password')}
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
                className="w-full mt-2"
              >
                Sign In
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Back Link to Candidate Portal */}
        <div className="mt-6 flex flex-col items-center gap-3 text-xs text-slate-500">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Candidate Portal
          </Link>
          <p className="text-center text-slate-400">
            Restricted access. All actions are logged and audited.
          </p>
        </div>
      </div>
    </div>
  );
}

export default AdminLoginPage;
