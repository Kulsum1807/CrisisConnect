import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import authService from '../../services/authService.js';
import { getErrorMessage } from '../../services/api.js';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import { useToast } from '../../components/common/Toast.jsx';
import { User, Lock } from 'lucide-react';
import EmergencyContactsSection from '../../components/user/EmergencyContactsSection.jsx';
import MedicalInfoSection from '../../components/user/MedicalInfoSection.jsx';

export const UserProfilePage = () => {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
  });
  const [profileLoading, setProfileLoading] = useState(false);

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      await authService.updateProfile(profileData);
      await refreshUser();
      showToast('Profile updated successfully', 'success');
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword.length < 8) {
      showToast('New password must be at least 8 characters', 'error');
      return;
    }

    setPasswordLoading(true);
    try {
      await authService.changePassword(passwordData);
      setPasswordData({ currentPassword: '', newPassword: '' });
      showToast('Password changed successfully', 'success');
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-8 pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-appText-primary font-display">
          Account Settings
        </h1>
        <p className="text-xs sm:text-sm text-appText-secondary mt-1">
          Manage your personal emergency contact details and credentials.
        </p>
      </div>

      {/* Profile Form */}
      <div className="bg-surface p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-sm space-y-5">
        <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-appText-primary font-display">Personal Details</h2>
            <p className="text-xs text-appText-secondary">Your official contact details for dispatchers</p>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="flex flex-col gap-4">
          <Input
            label="Full Name"
            value={profileData.name}
            onChange={(e) => setProfileData((prev) => ({ ...prev, name: e.target.value }))}
            required
          />

          <Input
            label="Email Address"
            type="email"
            value={user?.email || ''}
            disabled
            helperText="Email is permanently tied to your emergency registration."
          />

          <Input
            label="Emergency Contact Phone"
            type="tel"
            value={profileData.phone}
            onChange={(e) => setProfileData((prev) => ({ ...prev, phone: e.target.value }))}
            required
          />

          <Button type="submit" variant="primary" loading={profileLoading} className="w-fit self-end">
            Save Changes
          </Button>
        </form>
      </div>

      {/* Emergency Contacts Management */}
      <EmergencyContactsSection />

      {/* Medical Info Card Section (Private Health Data) */}
      <MedicalInfoSection />

      {/* Change Password Form */}

      <div className="bg-surface p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-sm space-y-5">
        <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
          <div className="p-2.5 rounded-xl bg-gray-100 text-gray-700">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-appText-primary font-display">Change Password</h2>
            <p className="text-xs text-appText-secondary">Ensure your account uses a strong, unique password</p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
          <Input
            label="Current Password"
            type="password"
            value={passwordData.currentPassword}
            onChange={(e) => setPasswordData((prev) => ({ ...prev, currentPassword: e.target.value }))}
            required
          />

          <Input
            label="New Password"
            type="password"
            value={passwordData.newPassword}
            onChange={(e) => setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))}
            helperText="Minimum 8 characters"
            required
          />

          <Button type="submit" variant="outline" loading={passwordLoading} className="w-fit self-end">
            Update Password
          </Button>
        </form>
      </div>
    </div>
  );
};

export default UserProfilePage;
