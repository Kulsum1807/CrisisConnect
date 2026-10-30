import http from 'http';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { io as Client } from 'socket.io-client';
import app from '../src/app.js';
import { initSocket } from '../src/sockets/index.js';
import {
  clearPendingDisconnects,
  clearLocationThrottles,
} from '../src/sockets/socketHandlers.js';
import {
  startEscalationTimer,
  cancelEscalationTimer,
  clearAllEscalationTimers,
  isEscalationActive,
} from '../src/services/escalationService.js';
import User from '../src/models/User.js';
import Incident from '../src/models/Incident.js';
import Counter from '../src/models/Counter.js';
import Notification from '../src/models/Notification.js';
import { ROLES } from '../src/constants/roles.js';
import { STATUSES } from '../src/constants/statuses.js';
import { SEVERITIES } from '../src/constants/severities.js';
import { CATEGORIES } from '../src/constants/categories.js';
import { VERIFICATION_STATUSES, AVAILABILITY } from '../src/constants/responder.js';
import { generateAccessToken } from '../src/utils/token.js';
import {
  toGeoJSONPoint,
  toLeafletCoords,
  calculateDistanceKm,
  isValidCoordinate,
} from '../src/utils/geo.js';
import {
  createIncident,
  claimIncident,
  cancelIncident,
  transitionIncident,
} from '../src/services/incidentService.js';

let mongoServer;
let httpServer;
let ioServer;
let port;
let activeClients = [];

const createClient = (token, options = {}) => {
  const client = Client(`http://localhost:${port}`, {
    autoConnect: false,
    transports: ['websocket'],
    auth: token ? { token } : undefined,
    ...options,
  });
  activeClients.push(client);
  return client;
};

const connectClientAsync = (client) => {
  return new Promise((resolve, reject) => {
    client.once('connect', () => resolve(client));
    client.once('connect_error', (err) => reject(err));
    client.connect();
  });
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  httpServer = http.createServer(app);
  ioServer = initSocket(httpServer);

  await new Promise((resolve) => {
    httpServer.listen(0, () => {
      port = httpServer.address().port;
      resolve();
    });
  });
});

afterAll(async () => {
  clearPendingDisconnects();
  clearLocationThrottles();
  clearAllEscalationTimers();

  for (const client of activeClients) {
    if (client.connected) client.disconnect();
  }
  activeClients = [];

  if (ioServer) {
    await new Promise((resolve) => ioServer.close(resolve));
  }
  if (httpServer) {
    await new Promise((resolve) => httpServer.close(resolve));
  }
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  clearPendingDisconnects();
  clearLocationThrottles();
  clearAllEscalationTimers();

  for (const client of activeClients) {
    if (client.connected) client.disconnect();
  }
  activeClients = [];

  await User.deleteMany({});
  await Incident.deleteMany({});
  await Counter.deleteMany({});
  await Notification.deleteMany({});
});

afterEach(() => {
  clearPendingDisconnects();
  clearLocationThrottles();
  clearAllEscalationTimers();

  for (const client of activeClients) {
    if (client.connected) client.disconnect();
  }
  activeClients = [];
});

describe('Phase 9: Maps and Location Tests', () => {
  let citizen, otherCitizen, assignedResponder, otherResponder, admin;
  let citizenToken, otherCitizenToken, assignedRespToken, otherRespToken, adminToken;
  let activeIncident;

  beforeEach(async () => {
    citizen = await User.create({
      name: 'John Citizen',
      email: 'citizen@example.com',
      phone: '9876543210',
      password: 'HashedPassword123!',
      role: ROLES.USER,
    });
    citizenToken = generateAccessToken({ userId: citizen._id.toString(), role: citizen.role });

    otherCitizen = await User.create({
      name: 'Eve Citizen',
      email: 'eve@example.com',
      phone: '9876543211',
      password: 'HashedPassword123!',
      role: ROLES.USER,
    });
    otherCitizenToken = generateAccessToken({ userId: otherCitizen._id.toString(), role: otherCitizen.role });

    assignedResponder = await User.create({
      name: 'Alpha Responder',
      email: 'alpha@example.com',
      phone: '9876543212',
      password: 'HashedPassword123!',
      role: ROLES.RESPONDER,
      responderProfile: {
        verificationStatus: VERIFICATION_STATUSES.VERIFIED,
        availability: AVAILABILITY.ONLINE,
        currentLocation: { type: 'Point', coordinates: [72.8777, 19.0760] },
      },
    });
    assignedRespToken = generateAccessToken({ userId: assignedResponder._id.toString(), role: assignedResponder.role });

    otherResponder = await User.create({
      name: 'Beta Responder',
      email: 'beta@example.com',
      phone: '9876543213',
      password: 'HashedPassword123!',
      role: ROLES.RESPONDER,
      responderProfile: {
        verificationStatus: VERIFICATION_STATUSES.VERIFIED,
        availability: AVAILABILITY.ONLINE,
        currentLocation: { type: 'Point', coordinates: [72.8800, 19.0800] },
      },
    });
    otherRespToken = generateAccessToken({ userId: otherResponder._id.toString(), role: otherResponder.role });

    admin = await User.create({
      name: 'Admin Boss',
      email: 'admin@example.com',
      phone: '9876543214',
      password: 'HashedPassword123!',
      role: ROLES.ADMIN,
    });
    adminToken = generateAccessToken({ userId: admin._id.toString(), role: admin.role });

    activeIncident = await Incident.create({
      incidentNumber: 'CC-9001',
      createdBy: citizen._id,
      category: CATEGORIES.MEDICAL,
      severity: SEVERITIES.HIGH,
      status: STATUSES.ACCEPTED,
      assignedResponder: assignedResponder._id,
      location: { type: 'Point', coordinates: [72.8777, 19.0760] },
      locationAvailable: true,
    });
  });

  // ==========================================
  // 1. Coordinate Utilities & Geo Calculations
  // ==========================================
  describe('1. Coordinate Conversion & Distance Calculations', () => {
    it('converts client format { lat, lng } to GeoJSON [lng, lat]', () => {
      const geoPoint = toGeoJSONPoint({ lat: 19.0760, lng: 72.8777 });
      expect(geoPoint).toEqual([72.8777, 19.0760]);
    });

    it('converts GeoJSON [lng, lat] to Leaflet format { lat, lng }', () => {
      const leafletCoords = toLeafletCoords([72.8777, 19.0760]);
      expect(leafletCoords).toEqual({ lat: 19.0760, lng: 72.8777 });
    });

    it('validates coordinate boundaries accurately', () => {
      expect(isValidCoordinate(19.076, 72.877)).toBe(true);
      expect(isValidCoordinate(-90, 180)).toBe(true);
      expect(isValidCoordinate(91, 50)).toBe(false);
      expect(isValidCoordinate(50, -181)).toBe(false);
      expect(isValidCoordinate(NaN, 72)).toBe(false);
      expect(isValidCoordinate('19.0', '72.0')).toBe(false);
    });

    it('computes accurate Haversine distance in km between two landmarks', () => {
      // Gateway of India: [72.8347, 18.9220]
      // Chhatrapati Shivaji Terminus: [72.8358, 18.9400]
      // Approx distance ~ 2.0 km
      const distance = calculateDistanceKm([72.8347, 18.9220], [72.8358, 18.9400]);
      expect(distance).toBeGreaterThan(1.8);
      expect(distance).toBeLessThan(2.2);
    });
  });

  // ==========================================
  // 2. responder:location Socket Handling
  // ==========================================
  describe('2. responder:location Authorization & Broadcasting', () => {
    it('rejects location updates from citizen user with FORBIDDEN error', async () => {
      const citizenClient = createClient(citizenToken);
      await connectClientAsync(citizenClient);

      const errPromise = new Promise((resolve) => citizenClient.on('error:event', resolve));
      citizenClient.emit('responder:location', {
        incidentId: activeIncident._id.toString(),
        lat: 19.0780,
        lng: 72.8790,
      });

      const err = await errPromise;
      expect(err.code).toBe('FORBIDDEN');
      expect(err.event).toBe('responder:location');
    });

    it('rejects location updates from unassigned responder with FORBIDDEN error', async () => {
      const otherRespClient = createClient(otherRespToken);
      await connectClientAsync(otherRespClient);

      const errPromise = new Promise((resolve) => otherRespClient.on('error:event', resolve));
      otherRespClient.emit('responder:location', {
        incidentId: activeIncident._id.toString(),
        lat: 19.0780,
        lng: 72.8790,
      });

      const err = await errPromise;
      expect(err.code).toBe('FORBIDDEN');
    });

    it('rejects location updates when incident is in PENDING status', async () => {
      activeIncident.status = STATUSES.PENDING;
      await activeIncident.save();

      const assignedClient = createClient(assignedRespToken);
      await connectClientAsync(assignedClient);

      const errPromise = new Promise((resolve) => assignedClient.on('error:event', resolve));
      assignedClient.emit('responder:location', {
        incidentId: activeIncident._id.toString(),
        lat: 19.0780,
        lng: 72.8790,
      });

      const err = await errPromise;
      expect(err.code).toBe('INVALID_INCIDENT_STATE');
    });

    it('rejects invalid coordinate values with INVALID_COORDINATES error', async () => {
      const assignedClient = createClient(assignedRespToken);
      await connectClientAsync(assignedClient);

      const errPromise = new Promise((resolve) => assignedClient.on('error:event', resolve));
      assignedClient.emit('responder:location', {
        incidentId: activeIncident._id.toString(),
        lat: 95.0, // Invalid latitude > 90
        lng: 72.8790,
      });

      const err = await errPromise;
      expect(err.code).toBe('INVALID_COORDINATES');
    });

    it('updates responder profile and broadcasts location to incident room and admins', async () => {
      const assignedClient = createClient(assignedRespToken);
      const citizenClient = createClient(citizenToken);
      const adminClient = createClient(adminToken);
      const outsiderClient = createClient(otherCitizenToken);

      await Promise.all([
        connectClientAsync(assignedClient),
        connectClientAsync(citizenClient),
        connectClientAsync(adminClient),
        connectClientAsync(outsiderClient),
      ]);

      // Citizen joins their incident room
      citizenClient.emit('incident:join', { incidentId: activeIncident._id.toString() });
      await new Promise((resolve) => setTimeout(resolve, 50));

      let outsiderGotLocation = false;
      outsiderClient.on('responder:location', () => { outsiderGotLocation = true; });

      const citizenLocationPromise = new Promise((resolve) => citizenClient.once('responder:location', resolve));
      const adminLocationPromise = new Promise((resolve) => adminClient.once('responder:location', resolve));

      // Responder emits valid location
      assignedClient.emit('responder:location', {
        incidentId: activeIncident._id.toString(),
        lat: 19.0795,
        lng: 72.8810,
      });

      const citizenData = await citizenLocationPromise;
      const adminData = await adminLocationPromise;

      expect(citizenData.incidentId).toBe(activeIncident._id.toString());
      expect(citizenData.lat).toBe(19.0795);
      expect(citizenData.lng).toBe(72.8810);
      expect(citizenData.at).toBeDefined();

      expect(adminData.incidentId).toBe(activeIncident._id.toString());
      expect(adminData.lat).toBe(19.0795);

      // Verify DB profile updated in GeoJSON order [lng, lat]
      const updatedUser = await User.findById(assignedResponder._id);
      expect(updatedUser.responderProfile.currentLocation.coordinates).toEqual([72.8810, 19.0795]);
      expect(updatedUser.responderProfile.lastLocationAt).toBeDefined();

      // Verify outsider received nothing
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(outsiderGotLocation).toBe(false);
    });

    it('throttles rapid location updates from responder', async () => {
      const assignedClient = createClient(assignedRespToken);
      await connectClientAsync(assignedClient);

      // First update succeeds
      assignedClient.emit('responder:location', {
        incidentId: activeIncident._id.toString(),
        lat: 19.0795,
        lng: 72.8810,
      });

      // Immediate second update within throttle window (100ms in test)
      const throttleErrPromise = new Promise((resolve) => assignedClient.once('error:event', resolve));
      assignedClient.emit('responder:location', {
        incidentId: activeIncident._id.toString(),
        lat: 19.0799,
        lng: 72.8815,
      });

      const err = await throttleErrPromise;
      expect(err.code).toBe('THROTTLED');

      // Wait past throttle window (120ms) and retry: should succeed
      await new Promise((resolve) => setTimeout(resolve, 120));
      let throttledAgain = false;
      assignedClient.once('error:event', () => { throttledAgain = true; });

      assignedClient.emit('responder:location', {
        incidentId: activeIncident._id.toString(),
        lat: 19.0805,
        lng: 72.8820,
      });

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(throttledAgain).toBe(false);
    });
  });

  // ==========================================
  // 3. Alert Escalation Timers
  // ==========================================
  describe('3. Alert Escalation with Timers', () => {
    it('starts escalation timer on incident creation and escalates when unclaimed', async () => {
      const adminClient = createClient(adminToken);
      await connectClientAsync(adminClient);

      const escalationEventPromise = new Promise((resolve) =>
        adminClient.once('incident:escalated', resolve)
      );

      // Create new emergency incident (triggers startEscalationTimer)
      const newInc = await createIncident(citizen, {
        category: CATEGORIES.FIRE,
        description: 'Fire in apartment block',
        latitude: 19.0760,
        longitude: 72.8777,
      });

      expect(isEscalationActive(newInc._id)).toBe(true);

      // Wait for test escalation timeout (200ms + margin)
      const escalatedData = await escalationEventPromise;
      expect(escalatedData.incidentId).toBe(newInc._id.toString());
      expect(escalatedData.widenedRadius).toBe(10); // 5km * 2 = 10km

      // Verify admin notification created
      const adminNotifications = await Notification.find({ userId: admin._id });
      const escalationNotif = adminNotifications.find((n) =>
        n.title.includes('Escalation: Unclaimed Emergency')
      );
      expect(escalationNotif).toBeDefined();
    });

    it('cancels escalation timer when incident is claimed before timeout', async () => {
      const newInc = await createIncident(citizen, {
        category: CATEGORIES.ACCIDENT,
        description: 'Minor traffic accident',
      });

      expect(isEscalationActive(newInc._id)).toBe(true);

      // Responder claims the incident before timeout
      await claimIncident(newInc._id, assignedResponder);

      // Escalation timer should be immediately cancelled
      expect(isEscalationActive(newInc._id)).toBe(false);

      // Wait past timeout (250ms) to ensure no escalation occurred
      await new Promise((resolve) => setTimeout(resolve, 250));
      const adminNotifications = await Notification.find({
        userId: admin._id,
        title: /Escalation:/,
      });
      expect(adminNotifications.length).toBe(0);
    });

    it('cancels escalation timer when incident is cancelled before timeout', async () => {
      const newInc = await createIncident(citizen, {
        category: CATEGORIES.OTHER,
        description: 'False alarm test',
      });

      expect(isEscalationActive(newInc._id)).toBe(true);

      // Creator cancels incident
      await cancelIncident(newInc._id, citizen, 'Citizen cancelled: resolved by self');

      // Escalation timer cancelled
      expect(isEscalationActive(newInc._id)).toBe(false);
    });
  });
});
