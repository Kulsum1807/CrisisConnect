import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { getErrorMessage } from '../../services/api.js';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import { ShieldAlert } from 'lucide-react';

export const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone || !formData.password) {
      setError('Please complete all required fields');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await register(formData);
      navigate('/user/dashboard', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-6 px-4">
      <div className="w-full max-w-md bg-surface p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-xl">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-emergency text-white flex items-center justify-center shadow-md mb-3">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-appText-primary font-display">
            Citizen Registration
          </h2>
          <p className="text-xs sm:text-sm text-appText-secondary mt-1">
            Create an account to report emergencies, trigger one-click SOS, and communicate with responders.
          </p>
        </div>

        {error && (
          <div className="p-3 mb-5 rounded-lg bg-red-50 border border-red-200 text-xs sm:text-sm text-emergency font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <Input
            label="Full Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g. Jane Doe"
            required
            autoComplete="name"
          />

          <Input
            label="Email Address"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="name@example.com"
            required
            autoComplete="email"
          />

          <Input
            label="Emergency Contact Phone"
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="+91 9876543210"
            helperText="10 to 15 digits. Used by responders to reach you on-scene."
            required
            autoComplete="tel"
          />

          <Input
            label="Password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="At least 8 characters"
            required
            autoComplete="new-password"
          />

          <Button
            type="submit"
            variant="emergency"
            size="lg"
            loading={loading}
            className="w-full mt-2 font-bold"
          >
            Create Citizen Account
          </Button>
        </form>

        <div className="mt-6 pt-5 border-t border-gray-100 text-center text-xs sm:text-sm text-appText-secondary">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-primary hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
