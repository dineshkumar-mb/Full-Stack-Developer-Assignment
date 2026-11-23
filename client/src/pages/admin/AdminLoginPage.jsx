import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../context/AuthContext.jsx';
import adminService from '../../services/adminService.js';
import Input from '../../components/common/Input.jsx';
import Button from '../../components/common/Button.jsx';
import Alert from '../../components/common/Alert.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/common/Card.jsx';
import { Shield, Lock, ArrowRight } from 'lucide-react';

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
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

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
      setServerError(
        err.response?.data?.message ||
          'Invalid administrative credentials. Please verify your email and password.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-950 mb-4 border border-indigo-500/30">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Admin Portal</h1>
          <p className="mt-1 text-sm text-slate-400">
            Aptitude Assessment Platform Management & Analytics
          </p>
        </div>

        <Card className="border-slate-800 bg-slate-950 text-slate-100 shadow-2xl">
          <CardHeader className="border-slate-800">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-400" />
              Sign In to Your Account
            </CardTitle>
            <CardDescription className="text-slate-400">
              Enter your authorized administrative email and password.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {serverError && (
              <Alert
                variant="error"
                title="Authentication Failed"
                className="mb-5 bg-rose-950/60 border-rose-800 text-rose-200"
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
                className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus:border-indigo-500"
                error={errors.email?.message}
                {...register('email')}
              />

              <Input
                id="password"
                type="password"
                label="Password"
                placeholder="••••••••••••"
                required
                className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus:border-indigo-500"
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

        <p className="text-center text-xs text-slate-500 mt-6">
          Restricted access. All actions are logged and audited.
        </p>
      </div>
    </div>
  );
}

export default AdminLoginPage;
