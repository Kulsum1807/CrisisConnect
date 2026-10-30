import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService.js';
import { getErrorMessage } from '../../services/api.js';
import { ROLES, ROLE_LABELS } from '../../constants/roles.js';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import Select from '../../components/common/Select.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { useToast } from '../../components/common/Toast.jsx';
import { Users, Search, Ban, CheckCircle2 } from 'lucide-react';

export const AdminUsersPage = () => {
  const { showToast } = useToast();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await adminService.getUsers({
        search: search || undefined,
        role: roleFilter || undefined,
      });
      setUsers(data?.items || data || []);
    } catch (err) {
      // In early phase, if admin/users isn't seeded with list, display clean empty state
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const handleToggleStatus = async (user) => {
    setActionLoadingId(user._id);
    const newStatus = !user.isActive;
    try {
      await adminService.updateUserStatus(user._id, newStatus, 'Status modified by admin');
      showToast(`User ${user.name} is now ${newStatus ? 'Active' : 'Suspended'}`, 'success');
      setUsers((prev) =>
        prev.map((u) => (u._id === user._id ? { ...u, isActive: newStatus } : u))
      );
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-appText-primary font-display">
          User Directory & Access Control
        </h1>
        <p className="text-xs sm:text-sm text-appText-secondary mt-1">
          Inspect registered accounts, verify roles, and suspend malicious users.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
        </div>

        <div className="w-full sm:w-48">
          <Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            options={[
              { value: '', label: 'All Roles' },
              { value: ROLES.USER, label: 'Citizens' },
              { value: ROLES.RESPONDER, label: 'Responders' },
              { value: ROLES.ADMIN, label: 'Admins' },
            ]}
          />
        </div>

        <Button variant="primary" size="md" onClick={fetchUsers} className="w-full sm:w-auto">
          Search
        </Button>
      </div>

      {/* Users Table */}
      <div className="bg-surface rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-appText-secondary">
            Loading user accounts...
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No Users Found"
            message="No registered user records match your search query."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-appText-secondary font-bold uppercase text-[11px] tracking-wider">
                  <th className="p-3.5 sm:p-4">Name</th>
                  <th className="p-3.5 sm:p-4">Email</th>
                  <th className="p-3.5 sm:p-4">Phone</th>
                  <th className="p-3.5 sm:p-4">Role</th>
                  <th className="p-3.5 sm:p-4">Status</th>
                  <th className="p-3.5 sm:p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-3.5 sm:p-4 font-bold text-appText-primary">{u.name}</td>
                    <td className="p-3.5 sm:p-4 text-appText-secondary">{u.email}</td>
                    <td className="p-3.5 sm:p-4 text-appText-secondary font-mono">{u.phone}</td>
                    <td className="p-3.5 sm:p-4">
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary">
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                    </td>
                    <td className="p-3.5 sm:p-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          u.isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {u.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="p-3.5 sm:p-4 text-right">
                      {u.role !== ROLES.ADMIN && (
                        <Button
                          variant={u.isActive ? 'danger' : 'secondary'}
                          size="sm"
                          onClick={() => handleToggleStatus(u)}
                          loading={actionLoadingId === u._id}
                          className="text-xs"
                        >
                          {u.isActive ? 'Suspend' : 'Reactivate'}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsersPage;
