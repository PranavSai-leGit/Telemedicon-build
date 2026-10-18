import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Activity, Lock, Mail, Eye, EyeOff, AlertCircle, ArrowRight, ShieldCheck, UserCheck, Stethoscope } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await login(email, password);
      if (user.role === 'clinician') {
        navigate('/clinician/dashboard');
      } else if (user.role === 'administrator') {
        navigate('/admin/dashboard');
      } else {
        navigate('/patient/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password123!');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-teal-500/20">
            <Activity className="w-6 h-6" />
          </div>
          <span className="font-bold text-2xl tracking-tight text-slate-900 dark:text-white">
            Medi<span className="text-teal-600 dark:text-teal-400">Tale</span>
          </span>
        </Link>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Sign in to your account
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Or{' '}
          <Link to="/register" className="font-medium text-teal-600 dark:text-teal-400 hover:underline">
            create a new patient account
          </Link>
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 sm:px-10 shadow-sm border border-slate-200/80 dark:border-slate-800 rounded-2xl">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start space-x-2.5 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs shadow-teal-600/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Autofill Buttons */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5 text-center">
              One-Click Demo Account Credentials
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillDemoCredentials('patient@meditale.demo')}
                className="p-2 text-center rounded-lg border border-teal-200 dark:border-teal-900/60 bg-teal-50/50 dark:bg-teal-950/30 hover:bg-teal-100/60 text-teal-800 dark:text-teal-300 text-[11px] font-medium transition-colors"
              >
                <UserCheck className="w-3.5 h-3.5 mx-auto mb-1 text-teal-600 dark:text-teal-400" />
                <span>Patient</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemoCredentials('clinician@meditale.demo')}
                className="p-2 text-center rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30 hover:bg-blue-100/60 text-blue-800 dark:text-blue-300 text-[11px] font-medium transition-colors"
              >
                <Stethoscope className="w-3.5 h-3.5 mx-auto mb-1 text-blue-600 dark:text-blue-400" />
                <span>Clinician</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemoCredentials('admin@meditale.demo')}
                className="p-2 text-center rounded-lg border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/30 hover:bg-purple-100/60 text-purple-800 dark:text-purple-300 text-[11px] font-medium transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5 mx-auto mb-1 text-purple-600 dark:text-purple-400" />
                <span>Admin</span>
              </button>
            </div>
            <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 mt-2">
              Password for all demonstration accounts: <code className="font-mono">Password123!</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
