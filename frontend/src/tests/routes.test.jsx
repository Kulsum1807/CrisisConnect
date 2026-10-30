import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../routes/ProtectedRoute.jsx';
import * as AuthContextModule from '../context/AuthContext.jsx';

describe('Frontend Component Tests: Route Guards', () => {
  it('should redirect unauthenticated users to /login', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      isAuthenticated: false,
      loading: false,
      user: null,
    });

    render(
      <MemoryRouter initialEntries={['/user/dashboard']}>
        <Routes>
          <Route path="/login" element={<div>Login Page Mock</div>} />
          <Route
            path="/user/dashboard"
            element={
              <ProtectedRoute>
                <div>Secret Dashboard</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Login Page Mock')).toBeInTheDocument();
    expect(screen.queryByText('Secret Dashboard')).not.toBeInTheDocument();
  });

  it('should allow authenticated users to view protected content', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      loading: false,
      user: { name: 'Jane Citizen', role: 'USER' },
    });

    render(
      <MemoryRouter initialEntries={['/user/dashboard']}>
        <Routes>
          <Route
            path="/user/dashboard"
            element={
              <ProtectedRoute>
                <div>Citizen Emergency Portal</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Citizen Emergency Portal')).toBeInTheDocument();
  });
});
