import L from 'leaflet';
import { SEVERITY_COLORS } from '../../constants/severities.js';

/**
 * Creates custom HTML/SVG div-icons for Leaflet.
 * Solves the missing PNG icon asset path issue in Vite while providing modern, severity-themed pins.
 */

const getSeverityColor = (severity) => {
  return SEVERITY_COLORS[severity] || '#EF6C00';
};

/**
 * Incident Location Pin Marker with severity color and optional pulsing ring.
 */
export const createIncidentIcon = (severity = 'HIGH', isPulsing = false) => {
  const color = getSeverityColor(severity);
  const isCritical = severity === 'CRITICAL' || isPulsing;

  const html = `
    <div class="relative flex items-center justify-center w-10 h-10 -translate-x-1/2 -translate-y-full cursor-pointer select-none">
      ${
        isCritical
          ? `<span class="absolute w-12 h-12 rounded-full animate-ping opacity-75" style="background-color: ${color};"></span>`
          : ''
      }
      <div class="relative z-10 w-9 h-9 rounded-full shadow-lg flex items-center justify-center border-2 border-white text-white font-bold text-xs" style="background-color: ${color};">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/>
        </svg>
      </div>
      <div class="w-2.5 h-2.5 rotate-45 border-r border-b border-white -mt-1 shadow" style="background-color: ${color};"></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-incident-pin',
    iconSize: [40, 44],
    iconAnchor: [20, 44],
    popupAnchor: [0, -44],
  });
};

/**
 * Live Responder Location Marker with radar ping animation.
 */
export const createResponderIcon = () => {
  const html = `
    <div class="relative flex items-center justify-center w-10 h-10 -translate-x-1/2 -translate-y-1/2 select-none">
      <span class="absolute w-12 h-12 rounded-full animate-ping bg-teal-400 opacity-60"></span>
      <div class="relative z-10 w-8 h-8 rounded-full bg-teal-600 border-2 border-white shadow-xl flex items-center justify-center text-white">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1 6h2v4h4v2h-4v4h-2v-4H7v-2h4V7z"/>
        </svg>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-responder-pin',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
};

/**
 * Citizen / User Marker.
 */
export const createUserIcon = () => {
  const html = `
    <div class="relative flex items-center justify-center w-8 h-8 -translate-x-1/2 -translate-y-1/2 select-none">
      <span class="absolute w-8 h-8 rounded-full animate-ping bg-blue-400 opacity-50"></span>
      <div class="relative z-10 w-6 h-6 rounded-full bg-blue-600 border-2 border-white shadow-md flex items-center justify-center text-white">
        <div class="w-2 h-2 rounded-full bg-white"></div>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-user-pin',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

/**
 * Draggable Location Picker Marker.
 */
export const createPickerIcon = () => {
  const html = `
    <div class="relative flex items-center justify-center w-10 h-10 -translate-x-1/2 -translate-y-full cursor-grab active:cursor-grabbing select-none">
      <div class="relative z-10 w-8 h-8 rounded-full bg-primary border-2 border-white shadow-2xl flex items-center justify-center text-white">
        <div class="w-2.5 h-2.5 rounded-full bg-emergency"></div>
      </div>
      <div class="w-2 h-2 rotate-45 border-r border-b border-white -mt-1 bg-primary"></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-picker-pin',
    iconSize: [32, 38],
    iconAnchor: [16, 38],
    popupAnchor: [0, -38],
  });
};

/**
 * Hospital Emergency Amenity Marker.
 * Displays distinct medical cross icon and 'Hospital' text badge.
 */
export const createHospitalIcon = () => {
  const html = `
    <div class="relative flex flex-col items-center cursor-pointer select-none -translate-x-1/2 -translate-y-full">
      <div class="relative z-10 w-8 h-8 rounded-full bg-red-600 border-2 border-white shadow-lg flex items-center justify-center text-white">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M19 10.5h-5.5V5h-3v5.5H5v3h5.5V19h3v-5.5H19z"/>
        </svg>
      </div>
      <div class="w-2 h-2 rotate-45 border-r border-b border-white -mt-1 bg-red-600 shadow"></div>
      <span class="mt-0.5 px-1.5 py-0.5 rounded bg-red-800 text-white text-[9px] font-bold shadow-sm whitespace-nowrap">Hospital</span>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-hospital-pin',
    iconSize: [44, 52],
    iconAnchor: [22, 52],
    popupAnchor: [0, -52],
  });
};

/**
 * Police Station Amenity Marker.
 * Displays distinct shield badge icon and 'Police' text badge.
 */
export const createPoliceIcon = () => {
  const html = `
    <div class="relative flex flex-col items-center cursor-pointer select-none -translate-x-1/2 -translate-y-full">
      <div class="relative z-10 w-8 h-8 rounded-full bg-blue-700 border-2 border-white shadow-lg flex items-center justify-center text-white">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
        </svg>
      </div>
      <div class="w-2 h-2 rotate-45 border-r border-b border-white -mt-1 bg-blue-700 shadow"></div>
      <span class="mt-0.5 px-1.5 py-0.5 rounded bg-blue-900 text-white text-[9px] font-bold shadow-sm whitespace-nowrap">Police</span>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-police-pin',
    iconSize: [44, 52],
    iconAnchor: [22, 52],
    popupAnchor: [0, -52],
  });
};

export default {
  createIncidentIcon,
  createResponderIcon,
  createUserIcon,
  createPickerIcon,
  createHospitalIcon,
  createPoliceIcon,
};

