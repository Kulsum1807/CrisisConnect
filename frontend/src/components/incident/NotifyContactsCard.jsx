import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Phone,
  MessageSquare,
  Share2,
  Copy,
  Check,
  Star,
  Users,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import useEmergencyContacts from '../../hooks/useEmergencyContacts.js';
import { RELATIONSHIP_LABELS } from '../../constants/contacts.js';
import Button from '../common/Button.jsx';
import { useToast } from '../common/Toast.jsx';

export const NotifyContactsCard = ({ incident }) => {
  const { contacts, loading } = useEmergencyContacts();
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  if (!incident) return null;

  // Resolve location link or address according to prompt specification
  const getLocationText = () => {
    const coords = incident.location?.coordinates;
    if (
      Array.isArray(coords) &&
      coords.length === 2 &&
      typeof coords[0] === 'number' &&
      typeof coords[1] === 'number'
    ) {
      // GeoJSON standard: [lng, lat] -> lat is coords[1], lng is coords[0]
      const lng = coords[0];
      const lat = coords[1];
      return `https://www.google.com/maps?q=${lat},${lng}`;
    }

    if (incident.location?.lat && incident.location?.lng) {
      return `https://www.google.com/maps?q=${incident.location.lat},${incident.location.lng}`;
    }

    return incident.address || 'No GPS / Address available';
  };

  const locationText = getLocationText();
  const prefilledMessage = `I need help. Incident ${incident.incidentNumber}. My location: ${locationText}`;

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(prefilledMessage);
      setCopied(true);
      showToast('Emergency alert text copied to clipboard', 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast('Unable to copy to clipboard', 'error');
    }
  };

  return (
    <div className="bg-surface p-5 sm:p-7 rounded-2xl border border-amber-200/90 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-appText-primary font-display">
              Notify My Contacts
            </h3>
            <p className="text-xs text-appText-secondary">
              Alert trusted contacts via Phone, SMS, or WhatsApp. Nothing is sent automatically.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyMessage}
          className="text-xs self-start sm:self-center"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
          ) : (
            <Copy className="w-3.5 h-3.5 mr-1" />
          )}
          {copied ? 'Copied' : 'Copy Alert Message'}
        </Button>
      </div>

      {/* Prefilled message preview box */}
      <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200/60 text-xs text-appText-primary">
        <span className="font-bold text-amber-800 uppercase tracking-wider text-[10px] block mb-1">
          Prefilled Message Template
        </span>
        <p className="font-mono text-gray-800 select-all break-all">
          "{prefilledMessage}"
        </p>
      </div>

      {/* Contacts List or Empty State */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : contacts.length === 0 ? (
        <div className="p-6 bg-gray-50 rounded-xl border border-gray-200 text-center space-y-3">
          <Users className="w-8 h-8 text-gray-400 mx-auto" />
          <div>
            <h4 className="text-sm font-bold text-appText-primary">
              No Emergency Contacts Configured
            </h4>
            <p className="text-xs text-appText-secondary max-w-sm mx-auto mt-1">
              Add trusted family or friends to quickly notify them during emergencies with 1 tap.
            </p>
          </div>
          <Link to="/user/profile">
            <Button variant="primary" size="sm" className="text-xs">
              Configure Emergency Contacts
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {contacts.map((contact) => {
            const rawDigits = (contact.phone || '').replace(/\D/g, '');
            const encodedMsg = encodeURIComponent(prefilledMessage);
            const waUrl = `https://wa.me/${rawDigits}?text=${encodedMsg}`;
            const smsUrl = `sms:${contact.phone}?body=${encodedMsg}`;
            const telUrl = `tel:${contact.phone}`;

            return (
              <div
                key={contact._id}
                className="p-3.5 sm:p-4 rounded-xl border border-gray-200/80 bg-white hover:border-gray-300 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                {/* Contact Meta */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs flex-shrink-0">
                    {contact.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-appText-primary">
                        {contact.name}
                      </span>
                      <span className="text-[11px] font-medium text-appText-secondary bg-gray-100 px-2 py-0.5 rounded-md">
                        {RELATIONSHIP_LABELS[contact.relationship] || contact.relationship}
                      </span>
                      {contact.isPrimary && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                          Primary
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-appText-secondary">
                      {contact.phone}
                    </span>
                  </div>
                </div>

                {/* 3 Action Buttons: Call, SMS, WhatsApp */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Call (tel:) */}
                  <a
                    href={telUrl}
                    className="touch-target inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    Call
                  </a>

                  {/* SMS (sms:) */}
                  <a
                    href={smsUrl}
                    className="touch-target inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                    SMS
                  </a>

                  {/* WhatsApp (wa.me) */}
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="touch-target inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                    WhatsApp
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NotifyContactsCard;
