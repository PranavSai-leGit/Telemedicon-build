import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sun, Moon, LogOut, Menu } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { MediTaleLogo } from './MediTaleLogo';

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
        return 'bg-[#EFF6FF] text-[#1E40AF] dark:bg-[#1E293B] dark:text-[#93C5FD] border-[#BFDBFE] dark:border-[#3B82F6]/30';
      case 'administrator':
        return 'bg-[#F5F3FF] text-[#6D28D9] dark:bg-[#2E1065] dark:text-[#C4B5FD] border-[#DDD6FE] dark:border-[#7C3AED]/30';
      default:
        return 'bg-[#E4F3F0] text-[#0F766E] dark:bg-[#123831] dark:text-[#5EEAD4] border-[#0F766E]/20 dark:border-[#5EEAD4]/30';
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#D9E3EB] dark:border-[#2A3A4D] bg-white/95 dark:bg-[#0E1726]/95 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Left Actions */}
        <div className="flex items-center space-x-3">
          {user && onMenuToggle && (
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-2 rounded-lg text-[#536777] hover:text-[#172B3A] dark:text-[#B2C0CE] dark:hover:text-[#E7EEF5] hover:bg-[#EDF3F7] dark:hover:bg-[#162437]"
              aria-label="Toggle menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <Link to="/" className="flex items-center space-x-2.5 group">
            <MediTaleLogo variant="full" size="md" showTagline={false} />
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
