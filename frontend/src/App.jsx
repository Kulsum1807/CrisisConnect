import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import RoleRoute from './routes/RoleRoute.jsx';
import { ROLES } from './constants/roles.js';

// Public pages
import LandingPage from './pages/public/LandingPage.jsx';
import LoginPage from './pages/public/LoginPage.jsx';
import RegisterPage from './pages/public/RegisterPage.jsx';
import RegisterResponderPage from './pages/public/RegisterResponderPage.jsx';
import AboutPage from './pages/public/AboutPage.jsx';

// Citizen (USER) pages
import UserDashboard from './pages/user/UserDashboard.jsx';
import ReportIncidentPage from './pages/user/ReportIncidentPage.jsx';
import UserIncidentsPage from './pages/user/UserIncidentsPage.jsx';
import IncidentDetailsPage from './pages/user/IncidentDetailsPage.jsx';
import UserProfilePage from './pages/user/UserProfilePage.jsx';

// Responder pages
import ResponderDashboard from './pages/responder/ResponderDashboard.jsx';
import ResponderIncidentsPage from './pages/responder/ResponderIncidentsPage.jsx';
import ResponderIncidentDetailsPage from './pages/responder/ResponderIncidentDetailsPage.jsx';
import ResponderProfilePage from './pages/responder/ResponderProfilePage.jsx';

// Admin pages
import AdminDashboardPage from './pages/admin/AdminDashboardPage.jsx';
import AdminUsersPage from './pages/admin/AdminUsersPage.jsx';
import AdminRespondersPage from './pages/admin/AdminRespondersPage.jsx';
import AdminIncidentsPage from './pages/admin/AdminIncidentsPage.jsx';
import AdminAnalyticsPage from './pages/admin/AdminAnalyticsPage.jsx';

// Standalone Nearby Help
import NearbyHelpPage from './pages/NearbyHelpPage.jsx';

// 404
import NotFoundPage from './pages/NotFoundPage.jsx';

export const App = () => {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/register-responder" element={<RegisterResponderPage />} />
        <Route path="/about" element={<AboutPage />} />

        {/* Nearby Help Standalone Directory */}
        <Route
          path="/nearby-help"
          element={
            <ProtectedRoute>
              <NearbyHelpPage />
            </ProtectedRoute>
          }
        />

        {/* Citizen (USER) Protected Routes */}
        <Route
          path="/user"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={[ROLES.USER]} />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<UserDashboard />} />
          <Route path="report" element={<ReportIncidentPage />} />
          <Route path="incidents" element={<UserIncidentsPage />} />
          <Route path="incidents/:id" element={<IncidentDetailsPage />} />
          <Route path="profile" element={<UserProfilePage />} />
        </Route>

        {/* Responder Protected Routes */}
        <Route
          path="/responder"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={[ROLES.RESPONDER]} />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<ResponderDashboard />} />
          <Route path="incidents" element={<ResponderIncidentsPage />} />
          <Route path="incidents/:id" element={<ResponderIncidentDetailsPage />} />
          <Route path="profile" element={<ResponderProfilePage />} />
        </Route>

        {/* Admin Protected Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={[ROLES.ADMIN]} />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="responders" element={<AdminRespondersPage />} />
          <Route path="incidents" element={<AdminIncidentsPage />} />
          <Route path="analytics" element={<AdminAnalyticsPage />} />
        </Route>

        {/* Fallback 404 Route */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};

export default App;
