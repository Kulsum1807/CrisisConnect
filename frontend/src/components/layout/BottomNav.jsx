import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { ROLES } from '../../constants/roles.js';
import {
  AlertCircle,
  FilePlus2,
  ListOrdered,
  User,
  Radio,
  Users,
  CheckCircle,
  BarChart3,
} from 'lucide-react';

export const BottomNav = () => {
  const { role, isAuthenticated } = useAuth();

  if (!isAuthenticated) return null;

  let navItems = [];

  if (role === ROLES.USER) {
    navItems = [
      { label: 'SOS', to: '/user/dashboard', icon: AlertCircle },
      { label: 'Report', to: '/user/report', icon: FilePlus2 },
      { label: 'History', to: '/user/incidents', icon: ListOrdered },
      { label: 'Profile', to: '/user/profile', icon: User },
    ];
  } else if (role === ROLES.RESPONDER) {
    navItems = [
      { label: 'Feed', to: '/responder/dashboard', icon: Radio },
      { label: 'Incidents', to: '/responder/incidents', icon: ListOrdered },
      { label: 'Profile', to: '/responder/profile', icon: User },
    ];
  } else if (role === ROLES.ADMIN) {
    navItems = [
      { label: 'Dashboard', to: '/admin/dashboard', icon: BarChart3 },
      { label: 'Incidents', to: '/admin/incidents', icon: AlertCircle },
      { label: 'Responders', to: '/admin/responders', icon: CheckCircle },
      { label: 'Users', to: '/admin/users', icon: Users },
    ];
  }

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/98 backdrop-blur-md border-t border-gray-200 pb-safe">
      <div className="grid grid-flow-col auto-cols-fr h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 transition-colors touch-target ${
                  isActive
                    ? 'text-primary font-bold'
                    : 'text-appText-secondary hover:text-appText-primary font-medium'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span className="text-[11px] leading-none">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
