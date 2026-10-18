import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, Sun, Moon, LogOut, ShieldAlert, User as UserIcon, Menu } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

interface NavbarProps {
  onMenuToggle?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuToggle }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'clinician':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'administrator':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      default:
        return 'bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300 border-teal-200 dark:border-teal-800';
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Left Actions */}
        <div className="flex items-center space-x-3">
          {user && onMenuToggle && (
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Toggle menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <Link to="/" className="flex items-center space-x-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">
                  Medi<span className="text-teal-600 dark:text-teal-400">Tale</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60">
                  Demo Node
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* Right Actions: Theme Toggle, User info, Logout */}
        <div className="flex items-center space-x-3">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-amber-400" />}
          </button>

          {user ? (
            <div className="flex items-center space-x-3 pl-2 border-l border-slate-200 dark:border-slate-800">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {user.full_name}
                </span>
                <span className={`text-[10px] font-medium px-1.5 py-0.2 border rounded-full capitalize ${getRoleBadge(user.role)}`}>
                  {user.role}
                </span>
              </div>

              <button
                onClick={handleLogout}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg border border-transparent hover:border-rose-200 dark:hover:border-rose-900 transition-all"
                title="Sign out of MediTale"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link
                to="/login"
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs shadow-teal-600/30 transition-all"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
