import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLES } from '../constants/roles.js';

export const RoleRoute = ({ allowedRoles = [], children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !allowedRoles.includes(user.role)) {
    // Route guard UX redirection: send user to their dedicated role home
    let redirectPath = '/login';
    if (user?.role === ROLES.USER) redirectPath = '/user/dashboard';
    else if (user?.role === ROLES.RESPONDER) redirectPath = '/responder/dashboard';
    else if (user?.role === ROLES.ADMIN) redirectPath = '/admin/dashboard';

    return <Navigate to={redirectPath} replace />;
  }

  return children ? children : <Outlet />;
};

export default RoleRoute;
