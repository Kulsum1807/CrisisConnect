import React from 'react';
import { STATUSES, STATUS_LABELS } from '../../constants/statuses.js';

export const StatusBadge = ({ status = 'PENDING', className = '' }) => {
  const configs = {
    [STATUSES.PENDING]: {
      bg: 'bg-gray-100 text-gray-800 border-gray-300',
    },
    [STATUSES.ASSIGNED]: {
      bg: 'bg-blue-50 text-blue-800 border-blue-300',
    },
    [STATUSES.ACCEPTED]: {
      bg: 'bg-teal-50 text-teal-800 border-teal-300',
    },
    [STATUSES.IN_PROGRESS]: {
      bg: 'bg-purple-50 text-purple-800 border-purple-300',
    },
    [STATUSES.RESOLVED]: {
      bg: 'bg-green-50 text-green-800 border-green-300',
    },
    [STATUSES.CANCELLED]: {
      bg: 'bg-slate-100 text-slate-700 border-slate-300',
    },
    [STATUSES.REJECTED]: {
      bg: 'bg-red-50 text-red-800 border-red-300',
    },
  };

  const config = configs[status] || configs[STATUSES.PENDING];
  const label = STATUS_LABELS[status] || status;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border tracking-wide select-none ${config.bg} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70" />
      <span>{label}</span>
    </span>
  );
};

export default StatusBadge;
