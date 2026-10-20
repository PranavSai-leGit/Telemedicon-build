import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Stethoscope,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { MediTaleLogo } from '../../components/MediTaleLogo';

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

  const fillDemoCredentials = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#F5F8FB] dark:bg-[#0B1220] text-[#172B3A] dark:text-[#E7EEF5] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center flex flex-col items-center">
        <Link to="/" className="inline-flex justify-center mb-2">
          <MediTaleLogo variant="full" size="lg" showTagline={true} />
        </Link>
        <h2 className="mt-4 text-xl font-bold tracking-tight text-[#172B3A] dark:text-[#E7EEF5]">
          Sign in to your account
        </h2>
        <p className="mt-1 text-xs text-[#536777] dark:text-[#91A3B5]">
          Or{' '}
          <Link to="/register" className="font-semibold text-[#0F766E] dark:text-[#5EEAD4] hover:underline">
            create a new patient account
          </Link>
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="med-card py-8 px-6 sm:px-10 shadow-sm">
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
                  className="med-input w-full pl-9"
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
                  className="med-input w-full pl-9 pr-10"
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
              className="med-btn-primary w-full mt-2 py-2.5"
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
          <div className="mt-6 pt-5 border-t border-[#D9E3EB] dark:border-[#2A3A4D]">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-[#536777] dark:text-[#91A3B5] mb-2.5 text-center">
              Quick Demonstration Accounts
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillDemoCredentials('patient@meditale.demo', 'Password123!')}
                className="p-2 text-center rounded-lg border border-[#0F766E]/20 bg-[#E4F3F0] dark:bg-[#123831] hover:bg-[#0F766E]/15 text-[#0F766E] dark:text-[#5EEAD4] text-[11px] font-medium transition-colors"
              >
                <UserCheck className="w-3.5 h-3.5 mx-auto mb-1 text-[#0F766E] dark:text-[#5EEAD4]" />
                <span>Patient</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemoCredentials('clinician@meditale.demo', 'Password123!')}
                className="p-2 text-center rounded-lg border border-[#BFDBFE] dark:border-[#3B82F6]/30 bg-[#EFF6FF] dark:bg-[#1E293B] hover:bg-[#BFDBFE]/50 text-[#1E40AF] dark:text-[#93C5FD] text-[11px] font-medium transition-colors"
              >
                <Stethoscope className="w-3.5 h-3.5 mx-auto mb-1 text-[#2563EB] dark:text-[#93C5FD]" />
                <span>Clinician</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemoCredentials('admin@meditale.demo', 'Password123!')}
                className="p-2 text-center rounded-lg border border-[#D9E3EB] dark:border-[#2A3A4D] bg-[#EDF3F7] dark:bg-[#162437] hover:bg-[#D9E3EB]/60 text-[#172B3A] dark:text-[#E7EEF5] text-[11px] font-medium transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5 mx-auto mb-1 text-[#536777] dark:text-[#91A3B5]" />
                <span>Admin</span>
              </button>
            </div>
            <p className="text-[10px] text-center text-[#536777] dark:text-[#91A3B5] mt-2">
              Instant login populated with verified synthetic patient histories.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
