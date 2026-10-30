import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { ROLES, ROLE_LABELS } from '../../constants/roles.js';
import { Shield, LogOut, User, AlertCircle, Building2 } from 'lucide-react';
import Button from '../common/Button.jsx';
import ConnectionIndicator from '../common/ConnectionIndicator.jsx';

export const Navbar = () => {
  const { user, isAuthenticated, logout, role } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getDashboardPath = () => {
    if (role === ROLES.ADMIN) return '/admin/dashboard';
    if (role === ROLES.RESPONDER) return '/responder/dashboard';
    return '/user/dashboard';
  };

  return (
    <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Admin Navigation */}
        <div className="flex items-center">
          <Link to={isAuthenticated ? getDashboardPath() : '/'} className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emergency flex items-center justify-center text-white shadow-sm">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-extrabold text-primary tracking-tight font-display">
                Crisis<span className="text-emergency">Connect</span>
              </span>
            </div>
          </Link>

          {/* Admin Desktop Navigation Links (Strictly visible only to ADMIN) */}
          {isAuthenticated && role === ROLES.ADMIN && (
            <div className="hidden lg:flex items-center gap-1 ml-6 border-l border-gray-200 pl-4">
              <Link
                to="/admin/dashboard"
                className="px-3 py-1.5 text-xs font-bold text-appText-secondary hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
              >
                Dashboard
              </Link>
              <Link
                to="/admin/responders"
                className="px-3 py-1.5 text-xs font-bold text-appText-secondary hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
              >
                Responders
              </Link>
              <Link
                to="/admin/incidents"
                className="px-3 py-1.5 text-xs font-bold text-appText-secondary hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
              >
                Incidents
              </Link>
              <Link
                to="/admin/users"
                className="px-3 py-1.5 text-xs font-bold text-appText-secondary hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
              >
                Users
              </Link>
            </div>
          )}
        </div>

        {/* Navigation & User Actions */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              {/* Real-time Connection Indicator */}
              <ConnectionIndicator />

              {/* Role badge */}
              <div className="hidden sm:flex items-center gap-2 bg-gray-100 py-1 px-3 rounded-full border border-gray-200">
                <span className="text-xs font-semibold text-appText-secondary">
                  {ROLE_LABELS[user?.role] || user?.role}
                </span>
                <span className="text-xs text-appText-primary font-bold">
                  {user?.name?.split(' ')[0]}
                </span>
              </div>

              {/* Nearby Help Link */}
              <Link
                to="/nearby-help"
                className="touch-target p-2 text-appText-secondary hover:text-primary hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold"
                title="Nearby Help (Hospitals & Police)"
              >
                <div className="flex items-center gap-0.5">
                  <Building2 className="w-4 h-4 text-red-600" />
                  <Shield className="w-4 h-4 text-blue-600" />
                </div>
                <span className="hidden md:inline">Nearby Help</span>
              </Link>

              {/* Profile Link */}
              <Link
                to={role === ROLES.RESPONDER ? '/responder/profile' : '/user/profile'}
                className="touch-target p-2 text-appText-secondary hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
                title="Profile Settings"
              >
                <User className="w-5 h-5" />
              </Link>

              {/* Logout Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-appText-secondary hover:text-emergency hidden sm:inline-flex"
              >
                <LogOut className="w-4 h-4 mr-1.5" />
                Logout
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="emergency" size="sm">
                  Report Emergency
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
