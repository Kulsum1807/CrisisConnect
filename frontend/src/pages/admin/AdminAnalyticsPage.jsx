import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService.js';
import { incidentService } from '../../services/incidentService.js';
import { CATEGORIES, CATEGORY_LABELS } from '../../constants/categories.js';
import { SEVERITIES } from '../../constants/severities.js';
import { STATUSES, STATUS_LABELS } from '../../constants/statuses.js';
import Button from '../../components/common/Button.jsx';
import { BarChart3, TrendingUp, PieChart, Activity } from 'lucide-react';

export const AdminAnalyticsPage = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const data = await incidentService.listIncidents({ limit: 100 });
        setIncidents(data.items || []);
      } catch {
        setIncidents([]);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  // Compute local aggregations
  const byCategory = incidents.reduce((acc, inc) => {
    acc[inc.category] = (acc[inc.category] || 0) + 1;
    return acc;
  }, {});

  const bySeverity = incidents.reduce((acc, inc) => {
    acc[inc.severity] = (acc[inc.severity] || 0) + 1;
    return acc;
  }, {});

  const byStatus = incidents.reduce((acc, inc) => {
    acc[inc.status] = (acc[inc.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-6 sm:gap-8 pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-appText-primary font-display">
          Incident Analytics & Response Intelligence
        </h1>
        <p className="text-xs sm:text-sm text-appText-secondary mt-1">
          Historical distribution across categories, triage severity levels, and lifecycle completion rates.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Severity Distribution */}
        <div className="bg-surface p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2 text-primary font-bold text-sm">
            <Activity className="w-4 h-4 text-emergency" />
            <span>Severity Distribution</span>
          </div>
          <div className="space-y-3">
            {Object.values(SEVERITIES).map((sev) => {
              const count = bySeverity[sev] || 0;
              const percent = incidents.length ? Math.round((count / incidents.length) * 100) : 0;
              return (
                <div key={sev} className="text-xs">
                  <div className="flex justify-between font-bold mb-1">
                    <span>{sev}</span>
                    <span>{count} ({percent}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full ${
                        sev === 'CRITICAL'
                          ? 'bg-emergency'
                          : sev === 'HIGH'
                          ? 'bg-orange-500'
                          : sev === 'MEDIUM'
                          ? 'bg-amber-400'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-surface p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2 text-primary font-bold text-sm">
            <PieChart className="w-4 h-4 text-primary" />
            <span>Emergency Categories</span>
          </div>
          <div className="space-y-3">
            {Object.entries(CATEGORIES).map(([key, cat]) => {
              const count = byCategory[cat] || 0;
              const percent = incidents.length ? Math.round((count / incidents.length) * 100) : 0;
              return (
                <div key={cat} className="text-xs">
                  <div className="flex justify-between font-semibold mb-1 truncate">
                    <span className="truncate max-w-[180px]">{CATEGORY_LABELS[cat] || cat}</span>
                    <span className="font-bold">{count}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-surface p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2 text-primary font-bold text-sm">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>Lifecycle Resolutions</span>
          </div>
          <div className="space-y-3">
            {Object.values(STATUSES).map((st) => {
              const count = byStatus[st] || 0;
              const percent = incidents.length ? Math.round((count / incidents.length) * 100) : 0;
              return (
                <div key={st} className="text-xs">
                  <div className="flex justify-between font-semibold mb-1">
                    <span>{STATUS_LABELS[st] || st}</span>
                    <span className="font-bold">{count}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-teal-600"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalyticsPage;
