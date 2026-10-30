import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useIncidents } from '../../hooks/useIncidents.js';
import SeverityBadge from '../../components/common/SeverityBadge.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { IncidentCardSkeleton } from '../../components/common/Skeleton.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import Button from '../../components/common/Button.jsx';
import { MapPin, ArrowRight, RefreshCw } from 'lucide-react';

export const ResponderIncidentsPage = () => {
  const [scope, setScope] = useState('assigned'); // 'assigned' | 'completed'

  const { incidents, loading, error, refresh } = useIncidents({
    scope,
    limit: 20,
  });

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-appText-primary font-display">
            Responder Incident Assignments
          </h1>
          <p className="text-xs sm:text-sm text-appText-secondary mt-1">
            Manage your active emergency operations and review completed cases.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading} className="w-fit">
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Scope Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setScope('assigned')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-colors touch-target ${
            scope === 'assigned'
              ? 'border-primary text-primary'
              : 'border-transparent text-appText-secondary hover:text-appText-primary'
          }`}
        >
          Active Incidents (On Duty)
        </button>
        <button
          type="button"
          onClick={() => setScope('completed')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-colors touch-target ${
            scope === 'completed'
              ? 'border-primary text-primary'
              : 'border-transparent text-appText-secondary hover:text-appText-primary'
          }`}
        >
          Completed / Resolved Cases
        </button>
      </div>

      {/* Incidents Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <IncidentCardSkeleton />
          <IncidentCardSkeleton />
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs sm:text-sm text-emergency">
          {error}
        </div>
      ) : incidents.length === 0 ? (
        <EmptyState
          title={scope === 'assigned' ? 'No Active Deployments' : 'No Completed History'}
          message={
            scope === 'assigned'
              ? 'You have no active emergency cases assigned at the moment. Claim an incident from the feed.'
              : 'No resolved incidents recorded yet.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {incidents.map((inc) => (
            <Link
              key={inc._id}
              to={`/responder/incidents/${inc._id}`}
              className="bg-surface p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-primary transition-all flex flex-col justify-between gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-mono font-bold text-primary">
                    {inc.incidentNumber}
                  </span>
                  <h3 className="text-base font-bold text-appText-primary font-display mt-0.5">
                    {inc.category} {inc.isSOS && '(SOS)'}
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  <SeverityBadge severity={inc.severity} />
                  <StatusBadge status={inc.status} />
                </div>
              </div>

              <p className="text-xs sm:text-sm text-appText-secondary line-clamp-2">
                {inc.description || 'Emergency SOS Distress Signal'}
              </p>

              <div className="flex items-center justify-between text-xs text-appText-secondary pt-2.5 border-t border-gray-100">
                <span className="flex items-center gap-1 truncate max-w-[200px]">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  {inc.address || (inc.locationAvailable ? 'GPS Verified' : 'Location Not Provided')}
                </span>
                <span className="flex items-center gap-1 font-bold text-primary">
                  Manage Incident <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResponderIncidentsPage;
