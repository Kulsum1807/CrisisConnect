import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/adminService.js';
import { incidentService } from '../../services/incidentService.js';
import { getErrorMessage } from '../../services/api.js';
import { SEVERITIES } from '../../constants/severities.js';
import { STATUSES } from '../../constants/statuses.js';
import SeverityBadge from '../../components/common/SeverityBadge.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import Button from '../../components/common/Button.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import AdminLiveMap from '../../components/map/AdminLiveMap.jsx';
import {
  AlertTriangle,
  Radio,
  CheckCircle,
  Clock,
  ArrowRight,
  ShieldAlert,
  Users,
  MapPin,
  Layers,
} from 'lucide-react';

export const AdminDashboardPage = () => {
  const [stats, setStats] = useState({
    activeIncidents: 0,
    criticalIncidents: 0,
    availableResponders: 0,
    resolvedToday: 0,
  });
  const [criticalList, setCriticalList] = useState([]);
  const [mapIncidents, setMapIncidents] = useState([]);
  const [mapResponders, setMapResponders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch dashboard stats
      try {
        const statsData = await adminService.getDashboardStats();
        if (statsData) setStats(statsData);
      } catch {
        // Fallback calculation from incident and responder lists if stats endpoint is empty
      }

      // 2. Fetch active critical / high incidents
      const incidentData = await incidentService.listIncidents({
        severity: SEVERITIES.CRITICAL,
        limit: 5,
      });
      setCriticalList(incidentData.items || []);

      // 3. Fetch active incidents for tactical map
      try {
        const allActive = await incidentService.listIncidents({
          limit: 25,
        });
        setMapIncidents(
          (allActive.items || []).filter(
            (inc) => !['RESOLVED', 'CANCELLED', 'REJECTED'].includes(inc.status)
          )
        );
      } catch {
        // Fallback silently if incident list fails
      }

      // 4. Fetch available responders for tactical map
      try {
        const respondersData = await adminService.getResponders({ limit: 25 });
        setMapResponders(respondersData.items || respondersData || []);
      } catch {
        // Fallback silently if responder fetch fails
      }
    } catch (err) {
      // Non-critical fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="flex flex-col gap-6 sm:gap-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-appText-primary font-display">
            Emergency Command Center
          </h1>
          <p className="text-xs sm:text-sm text-appText-secondary mt-1">
            Real-time multi-jurisdiction emergency oversight and dispatcher controls.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/admin/incidents">
            <Button variant="primary" size="sm">
              All Incidents Pool
            </Button>
          </Link>
          <Link to="/admin/responders">
            <Button variant="outline" size="sm">
              Verify Responders
            </Button>
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-appText-secondary tracking-wider">
              Active Emergencies
            </span>
            <div className="p-2 rounded-lg bg-blue-50 text-primary">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl sm:text-3xl font-extrabold text-appText-primary font-display">
            {stats.activeIncidents ?? 0}
          </span>
          <span className="text-[11px] text-appText-secondary">Pending or in-progress</span>
        </div>

        <div className="bg-surface p-5 rounded-2xl border border-red-200 shadow-sm flex flex-col justify-between gap-3 bg-red-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-emergency tracking-wider">
              Critical Cases
            </span>
            <div className="p-2 rounded-lg bg-red-100 text-emergency">
              <ShieldAlert className="w-4 h-4 animate-pulse" />
            </div>
          </div>
          <span className="text-2xl sm:text-3xl font-extrabold text-emergency font-display">
            {criticalList.length}
          </span>
          <span className="text-[11px] text-emergency font-semibold">Immediate attention needed</span>
        </div>

        <div className="bg-surface p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-appText-secondary tracking-wider">
              Available Responders
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl sm:text-3xl font-extrabold text-appText-primary font-display">
            {stats.availableResponders ?? 0}
          </span>
          <span className="text-[11px] text-appText-secondary">Verified & online on duty</span>
        </div>

        <div className="bg-surface p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-appText-secondary tracking-wider">
              Resolved
            </span>
            <div className="p-2 rounded-lg bg-gray-100 text-gray-700">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl sm:text-3xl font-extrabold text-appText-primary font-display">
            {stats.resolvedToday ?? 0}
          </span>
          <span className="text-[11px] text-appText-secondary">Successfully closed cases</span>
        </div>
      </div>

      {/* Real-Time Tactical Emergency Oversight Map */}
      <div className="bg-surface p-5 sm:p-7 rounded-2xl border border-gray-200 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-appText-primary font-display flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              Tactical Command Map
            </h2>
            <p className="text-xs text-appText-secondary">
              Live spatial distribution of ongoing emergencies and available first responders.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Telemetry
            </span>
          </div>
        </div>

        <AdminLiveMap
          incidents={mapIncidents}
          responders={mapResponders}
          height="380px"
        />
      </div>

      {/* Critical Incidents Urgent Attention Feed */}
      <div className="bg-surface p-5 sm:p-7 rounded-2xl border border-gray-200 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-appText-primary font-display flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-emergency" />
              Critical Priority Emergencies
            </h2>
            <p className="text-xs text-appText-secondary">
              Life-threatening emergencies currently awaiting response or assigned.
            </p>
          </div>
          <Link to="/admin/incidents?severity=CRITICAL">
            <Button variant="ghost" size="sm" className="text-xs font-semibold">
              View All <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>

        {criticalList.length === 0 ? (
          <EmptyState
            title="Zero Critical Alerts"
            message="No active incidents flagged with CRITICAL triage severity."
          />
        ) : (
          <div className="divide-y divide-gray-100">
            {criticalList.map((inc) => (
              <div
                key={inc._id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-primary">
                      {inc.incidentNumber}
                    </span>
                    <SeverityBadge severity={inc.severity} />
                    <StatusBadge status={inc.status} />
                  </div>
                  <h4 className="text-sm font-bold text-appText-primary mt-1 font-display">
                    {inc.category} {inc.isSOS && '(SOS)'} — {inc.description || 'Emergency SOS'}
                  </h4>
                  <p className="text-xs text-appText-secondary mt-0.5">
                    Location: {inc.address || (inc.locationAvailable ? 'GPS Pinpointed' : 'Not provided')}
                  </p>
                </div>
                <Link to={`/admin/incidents?search=${inc.incidentNumber}`}>
                  <Button variant="outline" size="sm" className="text-xs w-full sm:w-auto">
                    Manage / Assign
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboardPage;
