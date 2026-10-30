import React from 'react';
import { ShieldAlert, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { SEVERITIES } from '../../constants/severities.js';

export const SeverityBadge = ({ severity = 'MEDIUM', className = '' }) => {
  const configs = {
    [SEVERITIES.LOW]: {
      label: 'LOW',
      bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      icon: Info,
    },
    [SEVERITIES.MEDIUM]: {
      label: 'MEDIUM',
      bg: 'bg-amber-50 text-amber-900 border-amber-300',
      icon: AlertCircle,
    },
    [SEVERITIES.HIGH]: {
      label: 'HIGH',
      bg: 'bg-orange-50 text-orange-900 border-orange-300',
      icon: AlertTriangle,
    },
    [SEVERITIES.CRITICAL]: {
      label: 'CRITICAL',
      bg: 'bg-red-50 text-red-900 border-red-400 ring-2 ring-red-400/50 animate-pulse',
      icon: ShieldAlert,
    },
  };

  const config = configs[severity] || configs[SEVERITIES.MEDIUM];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border tracking-wide select-none ${config.bg} ${className}`}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <span>{config.label}</span>
    </span>
  );
};

export default SeverityBadge;
