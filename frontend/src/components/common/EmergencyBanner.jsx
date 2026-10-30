import React from 'react';
import { PhoneCall } from 'lucide-react';

export const EmergencyBanner = ({ className = '' }) => {
  return (
    <div
      className={`w-full bg-emergency/10 border border-emergency/30 rounded-xl p-3 sm:p-4 flex items-center justify-between gap-3 text-emergency ${className}`}
    >
      <div className="flex items-center gap-2.5">
        <div className="p-2 bg-emergency text-white rounded-lg flex-shrink-0">
          <PhoneCall className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
        </div>
        <div>
          <h5 className="text-xs sm:text-sm font-bold text-emergency-dark font-display leading-tight">
            Immediate Life-Threatening Crisis?
          </h5>
          <p className="text-[11px] sm:text-xs text-appText-secondary leading-normal">
            Dial National Emergency Helpline <strong>112</strong> immediately.
          </p>
        </div>
      </div>
      <a
        href="tel:112"
        className="touch-target inline-flex items-center justify-center px-3.5 py-1.5 bg-emergency text-white text-xs sm:text-sm font-bold rounded-lg shadow-sm hover:bg-emergency-dark transition-colors flex-shrink-0"
      >
        Call 112
      </a>
    </div>
  );
};

export default EmergencyBanner;
