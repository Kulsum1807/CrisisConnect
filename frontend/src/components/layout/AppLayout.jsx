import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import BottomNav from './BottomNav.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSocketEvent } from '../../hooks/useSocket.js';
import { useToast } from '../common/Toast.jsx';
import { ROLES } from '../../constants/roles.js';
import {
  AlertCircle,
  FilePlus2,
  ListOrdered,
  Radio,
  BarChart3,
  Users,
  CheckCircle,
} from 'lucide-react';

export const AppLayout = () => {
  const { role, isAuthenticated } = useAuth();
  const { showToast } = useToast();

  // Real-time in-app notification toasts
  useSocketEvent('notification:new', (notification) => {
    if (notification?.title) {
      showToast(`${notification.title}: ${notification.message}`, 'info');
    }
  });

  let desktopNavItems = [];

  if (role === ROLES.USER) {
    desktopNavItems = [
      { label: 'SOS Alert', to: '/user/dashboard', icon: AlertCircle },
      { label: 'File Report', to: '/user/report', icon: FilePlus2 },
      { label: 'My Incidents', to: '/user/incidents', icon: ListOrdered },
    ];
  } else if (role === ROLES.RESPONDER) {
    desktopNavItems = [
      { label: 'Live Emergency Feed', to: '/responder/dashboard', icon: Radio },
      { label: 'Assigned Incidents', to: '/responder/incidents', icon: ListOrdered },
    ];
  } else if (role === ROLES.ADMIN) {
    desktopNavItems = [
      { label: 'Command Center', to: '/admin/dashboard', icon: BarChart3 },
      { label: 'Incident Pool', to: '/admin/incidents', icon: AlertCircle },
      { label: 'Responder Verification', to: '/admin/responders', icon: CheckCircle },
      { label: 'User Directory', to: '/admin/users', icon: Users },
    ];
  }

  return (
    <div className="min-h-screen flex flex-col bg-background pb-20 sm:pb-8">
      <Navbar />

      {/* Sub-header navigation on Desktop */}
      {isAuthenticated && desktopNavItems.length > 0 && (
        <div className="hidden sm:block bg-surface border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1 overflow-x-auto py-2">
            {desktopNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-appText-secondary hover:text-appText-primary hover:bg-gray-100'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  );
};

export default AppLayout;
