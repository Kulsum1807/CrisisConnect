import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { ROLES } from '../../constants/roles.js';
import { getErrorMessage } from '../../services/api.js';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import { Shield, Lock, Mail } from 'lucide-react';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide your email and password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const user = await login({ email, password });
      // Redirect to the originally attempted page, or to the role dashboard
      const from = location.state?.from?.pathname;
      if (from) {
        navigate(from, { replace: true });
      } else if (user?.role === ROLES.ADMIN) {
        navigate('/admin/dashboard', { replace: true });
      } else if (user?.role === ROLES.RESPONDER) {
        navigate('/responder/dashboard', { replace: true });
      } else {
        navigate('/user/dashboard', { replace: true });
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-6 px-4">
      <div className="w-full max-w-md bg-surface p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-xl">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center shadow-md mb-3">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-appText-primary font-display">
            Sign In to CrisisConnect
          </h2>
          <p className="text-xs sm:text-sm text-appText-secondary mt-1">
            Access emergency dispatch, incident reporting, and responder tools.
          </p>
        </div>

        {error && (
          <div className="p-3 mb-5 rounded-lg bg-red-50 border border-red-200 text-xs sm:text-sm text-emergency font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            required
            autoComplete="email"
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            className="w-full mt-2 font-bold"
          >
            Sign In
          </Button>
        </form>

        <div className="mt-6 pt-5 border-t border-gray-100 flex flex-col gap-2 text-center text-xs sm:text-sm text-appText-secondary">
          <p>
            Need to report an emergency?{' '}
            <Link to="/register" className="font-bold text-emergency hover:underline">
              Register as Citizen
            </Link>
          </p>
          <p>
            Want to help save lives?{' '}
            <Link to="/register-responder" className="font-bold text-primary hover:underline">
              Volunteer as First Responder
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
