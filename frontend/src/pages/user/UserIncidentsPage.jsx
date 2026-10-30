import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useIncidents } from '../../hooks/useIncidents.js';
import { STATUSES } from '../../constants/statuses.js';
import SeverityBadge from '../../components/common/SeverityBadge.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { IncidentCardSkeleton } from '../../components/common/Skeleton.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import Button from '../../components/common/Button.jsx';
import { MapPin, ArrowRight, RefreshCw } from 'lucide-react';

export const UserIncidentsPage = () => {
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const { incidents, pagination, loading, error, refresh } = useIncidents({
    status: statusFilter || undefined,
    page,
    limit: 10,
  });

  const filterTabs = [
    { label: 'All Incidents', value: '' },
    { label: 'Pending', value: STATUSES.PENDING },
    { label: 'In Progress', value: STATUSES.IN_PROGRESS },
    { label: 'Resolved', value: STATUSES.RESOLVED },
    { label: 'Cancelled', value: STATUSES.CANCELLED },
  ];

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-appText-primary font-display">
            My Emergency Reports
          </h1>
          <p className="text-xs sm:text-sm text-appText-secondary mt-1">
            Historical log of all emergency calls and reports associated with your account.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          className="w-fit"
          disabled={loading}
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Status
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-gray-200">
        {filterTabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => {
              setStatusFilter(tab.value);
              setPage(1);
            }}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap touch-target ${
              statusFilter === tab.value
                ? 'bg-primary text-white shadow-sm'
                : 'text-appText-secondary hover:text-appText-primary hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Incident List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <IncidentCardSkeleton />
          <IncidentCardSkeleton />
          <IncidentCardSkeleton />
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs sm:text-sm text-emergency">
          {error}
        </div>
      ) : incidents.length === 0 ? (
        <EmptyState
          title="No incidents found"
          message={
            statusFilter
              ? `No incidents matching "${statusFilter}".`
              : "You haven't submitted any emergency reports yet."
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {incidents.map((inc) => (
            <Link
              key={inc._id}
              to={`/user/incidents/${inc._id}`}
              className="bg-surface p-4 sm:p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-primary transition-all flex flex-col justify-between gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-mono font-bold text-primary">
                    {inc.incidentNumber}
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-appText-primary font-display mt-0.5">
                    {inc.category} {inc.isSOS && '(SOS Trigger)'}
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  <SeverityBadge severity={inc.severity} />
                  <StatusBadge status={inc.status} />
                </div>
              </div>

              <p className="text-xs text-appText-secondary line-clamp-2">
                {inc.description || 'Emergency SOS broadcast.'}
              </p>

              <div className="flex items-center justify-between text-xs text-appText-secondary pt-2.5 border-t border-gray-100">
                <span className="flex items-center gap-1 truncate max-w-[200px]">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  {inc.address || (inc.locationAvailable ? 'GPS Pinpointed' : 'Location Not Provided')}
                </span>
                <span className="flex items-center gap-1 font-semibold text-primary">
                  View Timeline <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={pagination.page <= 1 || loading}
          >
            Previous
          </Button>
          <span className="text-xs text-appText-secondary font-medium">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={pagination.page >= pagination.totalPages || loading}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default UserIncidentsPage;
