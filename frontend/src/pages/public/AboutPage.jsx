import React from 'react';
import { Shield, CheckCircle, Radio, Clock, Heart } from 'lucide-react';
import EmergencyBanner from '../../components/common/EmergencyBanner.jsx';

export const AboutPage = () => {
  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8 pb-10">
      <EmergencyBanner />

      <div className="bg-surface p-6 sm:p-10 rounded-2xl border border-gray-200 shadow-sm space-y-6">
        <div className="border-b border-gray-100 pb-5">
          <h1 className="text-2xl sm:text-4xl font-extrabold text-appText-primary font-display">
            About CrisisConnect
          </h1>
          <p className="text-sm sm:text-base text-appText-secondary mt-2 leading-relaxed">
            CrisisConnect is an open emergency response and incident coordination platform designed to minimize dispatch latency and bridge the critical minutes before formal ambulances or authorities arrive.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-red-50 text-emergency flex-shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-appText-primary font-display">
                Deterministic State Machine
              </h3>
              <p className="text-xs text-appText-secondary mt-1">
                Every incident lifecycle transition (PENDING → ASSIGNED → ACCEPTED → IN_PROGRESS → RESOLVED) is strictly verified on the backend, complete with immutable audit logs.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-primary flex-shrink-0">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-appText-primary font-display">
                Atomic Concurrency Control
              </h3>
              <p className="text-xs text-appText-secondary mt-1">
                Guarantees exclusive ownership so only one responder can claim an active emergency, preventing duplicate dispatch confusion.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 flex-shrink-0">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-appText-primary font-display">
                Admin Verified Network
              </h3>
              <p className="text-xs text-appText-secondary mt-1">
                Responders undergo administrative vetting before gaining dispatch privileges.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-purple-50 text-purple-700 flex-shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-appText-primary font-display">
                Automated Clinical Triage
              </h3>
              <p className="text-xs text-appText-secondary mt-1">
                Computes severity (LOW, MEDIUM, HIGH, CRITICAL) using standardized emergency triage indicators without relying on error-prone client input.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
