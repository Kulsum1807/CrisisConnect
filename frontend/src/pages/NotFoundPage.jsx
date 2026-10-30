import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/common/Button.jsx';
import { AlertCircle } from 'lucide-react';

export const NotFoundPage = () => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 mb-4">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-extrabold text-appText-primary font-display">404 — Page Not Found</h1>
      <p className="text-sm text-appText-secondary max-w-sm mt-2 mb-6">
        The emergency protocol or page you requested does not exist or has been relocated.
      </p>
      <Link to="/">
        <Button variant="primary">Return to CrisisConnect Home</Button>
      </Link>
    </div>
  );
};

export default NotFoundPage;
