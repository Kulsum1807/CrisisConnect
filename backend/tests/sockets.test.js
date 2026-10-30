import http from 'http';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { io as Client } from 'socket.io-client';
import app from '../src/app.js';
import { initSocket } from '../src/sockets/index.js';
import { clearPendingDisconnects } from '../src/sockets/socketHandlers.js';
import {
  emitIncidentNew,
  emitIncidentUpdated,
  emitIncidentTaken,
  emitNotificationNew,
} from '../src/sockets/realtimeEmitter.js';
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
  createIncident,
  claimIncident,
  transitionIncident,
} from '../src/services/incidentService.js';
import { createNotification } from '../src/services/notificationService.js';

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
  for (const client of activeClients) {
    if (client.connected) client.disconnect();
  }
  activeClients = [];

  if (ioServer) {
    await new Promise((resolve) => ioServer.close(resolve));
  }
  clearPendingDisconnects();

  if (httpServer) {
    await new Promise((resolve) => httpServer.close(resolve));
  }
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(() => {
  clearPendingDisconnects();
  for (const client of activeClients) {
    if (client.connected) client.disconnect();
  }
  activeClients = [];
  clearPendingDisconnects();
});

beforeEach(async () => {
  clearPendingDisconnects();
  for (const client of activeClients) {
    if (client.connected) client.disconnect();
  }
  activeClients = [];

  await User.deleteMany({});
  await Incident.deleteMany({});
  await Counter.deleteMany({});
  await Notification.deleteMany({});
});

describe('Phase 8: Real-Time Communication (Socket.IO) Tests', () => {
  let citizenUser, otherCitizen, onlineResponder, offlineResponder, adminUser;
  let citizenToken, otherToken, onlineRespToken, offlineRespToken, adminToken;

  beforeEach(async () => {
    citizenUser = await User.create({
      name: 'Alice Citizen',
      email: 'alice@example.com',
      phone: '9876543210',
      password: 'HashedPassword123!',
      role: ROLES.USER,
    });
    citizenToken = generateAccessToken({ userId: citizenUser._id.toString(), role: citizenUser.role });

    otherCitizen = await User.create({
      name: 'Charlie Stranger',
      email: 'charlie@example.com',
      phone: '9876543211',
      password: 'HashedPassword123!',
      role: ROLES.USER,
    });
    otherToken = generateAccessToken({ userId: otherCitizen._id.toString(), role: otherCitizen.role });

    onlineResponder = await User.create({
      name: 'Bob Responder',
      email: 'bob@example.com',
      phone: '9876543212',
      password: 'HashedPassword123!',
      role: ROLES.RESPONDER,
      responderProfile: {
        verificationStatus: VERIFICATION_STATUSES.VERIFIED,
        availability: AVAILABILITY.ONLINE,
        currentLocation: { type: 'Point', coordinates: [72.8777, 19.0760] },
      },
    });
    onlineRespToken = generateAccessToken({ userId: onlineResponder._id.toString(), role: onlineResponder.role });

    offlineResponder = await User.create({
      name: 'Dave Offline',
      email: 'dave@example.com',
      phone: '9876543213',
      password: 'HashedPassword123!',
      role: ROLES.RESPONDER,
      responderProfile: {
        verificationStatus: VERIFICATION_STATUSES.VERIFIED,
        availability: AVAILABILITY.OFFLINE,
      },
    });
    offlineRespToken = generateAccessToken({ userId: offlineResponder._id.toString(), role: offlineResponder.role });

    adminUser = await User.create({
      name: 'Admin Boss',
      email: 'admin@example.com',
      phone: '9876543214',
      password: 'HashedPassword123!',
      role: ROLES.ADMIN,
    });
    adminToken = generateAccessToken({ userId: adminUser._id.toString(), role: adminUser.role });
  });

  describe('1. Handshake Authentication', () => {
    it('rejects connection if no token is provided', async () => {
      const client = createClient(null);
      await expect(connectClientAsync(client)).rejects.toThrow();
    });

    it('rejects connection if token is malformed or invalid', async () => {
      const client = createClient('invalid.token.here');
      await expect(connectClientAsync(client)).rejects.toThrow();
    });

    it('rejects connection if user is deactivated or suspended', async () => {
      await User.findByIdAndUpdate(citizenUser._id, { isActive: false });
      const client = createClient(citizenToken);
      await expect(connectClientAsync(client)).rejects.toThrow();
    });

    it('successfully connects with valid token', async () => {
      const client = createClient(citizenToken);
      const connectedClient = await connectClientAsync(client);
      expect(connectedClient.connected).toBe(true);
    });
  });

  describe('2. Room Joining and Authorization (incident:join & incident:leave)', () => {
    let testIncident;

    beforeEach(async () => {
      testIncident = await Incident.create({
        incidentNumber: 'CC-1001',
        createdBy: citizenUser._id,
        category: CATEGORIES.MEDICAL,
        severity: SEVERITIES.HIGH,
        status: STATUSES.PENDING,
        location: { type: 'Point', coordinates: [72.8777, 19.0760] },
      });
    });

    it('allows incident creator to join incident room', async () => {
      const client = createClient(citizenToken);
      await connectClientAsync(client);

      const errorPromise = new Promise((resolve) => {
        client.on('error:event', resolve);
        setTimeout(() => resolve(null), 200);
      });

      client.emit('incident:join', { incidentId: testIncident._id.toString() });
      const err = await errorPromise;
      expect(err).toBeNull();
    });

    it('allows admin to join any incident room', async () => {
      const client = createClient(adminToken);
      await connectClientAsync(client);

      const errorPromise = new Promise((resolve) => {
        client.on('error:event', resolve);
        setTimeout(() => resolve(null), 200);
      });

      client.emit('incident:join', { incidentId: testIncident._id.toString() });
      const err = await errorPromise;
      expect(err).toBeNull();
    });

    it('denies outsider citizen from joining someone else\'s incident room with error:event FORBIDDEN', async () => {
      const client = createClient(otherToken);
      await connectClientAsync(client);

      const errorPromise = new Promise((resolve) => {
        client.on('error:event', resolve);
      });

      client.emit('incident:join', { incidentId: testIncident._id.toString() });
      const err = await errorPromise;

      expect(err).toBeDefined();
      expect(err.code).toBe('FORBIDDEN');
      expect(err.event).toBe('incident:join');
    });

    it('denies unassigned responder from joining non-pending incident', async () => {
      // Transition incident to ASSIGNED with another responder
      testIncident.status = STATUSES.ACCEPTED;
      testIncident.assignedResponder = new mongoose.Types.ObjectId();
      await testIncident.save();

      const client = createClient(onlineRespToken);
      await connectClientAsync(client);

      const errorPromise = new Promise((resolve) => {
        client.on('error:event', resolve);
      });

      client.emit('incident:join', { incidentId: testIncident._id.toString() });
      const err = await errorPromise;

      expect(err).toBeDefined();
      expect(err.code).toBe('FORBIDDEN');
    });

    it('emits INVALID_ID for invalid incident ID format', async () => {
      const client = createClient(citizenToken);
      await connectClientAsync(client);

      const errorPromise = new Promise((resolve) => {
        client.on('error:event', resolve);
      });

      client.emit('incident:join', { incidentId: 'invalid-id' });
      const err = await errorPromise;

      expect(err).toBeDefined();
      expect(err.code).toBe('INVALID_ID');
    });

    it('allows incident:leave without error', async () => {
      const client = createClient(citizenToken);
      await connectClientAsync(client);

      client.emit('incident:join', { incidentId: testIncident._id.toString() });
      client.emit('incident:leave', { incidentId: testIncident._id.toString() });

      // No error event emitted
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(client.connected).toBe(true);
    });
  });

  describe('3. Event Broadcasts', () => {
    it('broadcasts incident:new to online responders and admins, but NOT to citizens', async () => {
      const citizenClient = createClient(citizenToken);
      const responderClient = createClient(onlineRespToken);
      const offlineClient = createClient(offlineRespToken);
      const adminClient = createClient(adminToken);

      await Promise.all([
        connectClientAsync(citizenClient),
        connectClientAsync(responderClient),
        connectClientAsync(offlineClient),
        connectClientAsync(adminClient),
      ]);

      let citizenGotEvent = false;
      let offlineGotEvent = false;
      citizenClient.on('incident:new', () => { citizenGotEvent = true; });
      offlineClient.on('incident:new', () => { offlineGotEvent = true; });

      const respPromise = new Promise((resolve) => responderClient.once('incident:new', resolve));
      const adminPromise = new Promise((resolve) => adminClient.once('incident:new', resolve));

      // Trigger creation via service
      const newInc = await createIncident(citizenUser, {
        category: CATEGORIES.FIRE,
        description: 'Building fire emergency',
        latitude: 19.0760,
        longitude: 72.8777,
        address: '123 Test St',
      });

      const respData = await respPromise;
      const adminData = await adminPromise;

      expect(respData.incidentId).toBe(newInc._id.toString());
      expect(respData.category).toBe(CATEGORIES.FIRE);
      expect(adminData.incidentId).toBe(newInc._id.toString());

      // Wait a bit to verify citizen and offline responder received nothing
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(citizenGotEvent).toBe(false);
      expect(offlineGotEvent).toBe(false);
    });

    it('broadcasts incident:updated to incident room participants and creator', async () => {
      const creatorClient = createClient(citizenToken);
      const respClient = createClient(onlineRespToken);
      const otherClient = createClient(otherToken);

      await Promise.all([
        connectClientAsync(creatorClient),
        connectClientAsync(respClient),
        connectClientAsync(otherClient),
      ]);

      const incident = await createIncident(citizenUser, {
        category: CATEGORIES.ACCIDENT,
        description: 'Road accident reported',
      });

      // Responder claims the incident
      await claimIncident(incident._id, onlineResponder);

      // Join incident room
      respClient.emit('incident:join', { incidentId: incident._id.toString() });
      await new Promise((resolve) => setTimeout(resolve, 50));

      let otherGotUpdate = false;
      otherClient.on('incident:updated', () => { otherGotUpdate = true; });

      const creatorUpdatePromise = new Promise((resolve) => creatorClient.once('incident:updated', resolve));
      const respUpdatePromise = new Promise((resolve) => respClient.once('incident:updated', resolve));

      // Transition incident
      await transitionIncident(incident._id, STATUSES.IN_PROGRESS, onlineResponder);

      const creatorData = await creatorUpdatePromise;
      const respData = await respUpdatePromise;

      expect(creatorData.incidentId).toBe(incident._id.toString());
      expect(creatorData.status).toBe(STATUSES.IN_PROGRESS);
      expect(respData.status).toBe(STATUSES.IN_PROGRESS);

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(otherGotUpdate).toBe(false);
    });

    it('broadcasts incident:taken to online responders when incident is claimed', async () => {
      // Create a second online responder to receive the taken broadcast
      const secondResponder = await User.create({
        name: 'Second Responder',
        email: 'resp2@example.com',
        phone: '9876543299',
        password: 'HashedPassword123!',
        role: ROLES.RESPONDER,
        responderProfile: {
          verificationStatus: VERIFICATION_STATUSES.VERIFIED,
          availability: AVAILABILITY.ONLINE,
          currentLocation: { type: 'Point', coordinates: [72.8777, 19.0760] },
        },
      });
      const secondToken = generateAccessToken({
        userId: secondResponder._id.toString(),
        role: secondResponder.role,
      });

      const resp2Client = createClient(secondToken);
      await connectClientAsync(resp2Client);

      const incident = await createIncident(citizenUser, {
        category: CATEGORIES.MEDICAL,
        description: 'Heart attack emergency',
      });

      const takenPromise = new Promise((resolve) => resp2Client.once('incident:taken', resolve));

      // First responder claims the incident
      await claimIncident(incident._id, onlineResponder);

      const takenData = await takenPromise;
      expect(takenData.incidentId).toBe(incident._id.toString());
    });

    it('emits notification:new exclusively to the target user room', async () => {
      const citizenClient = createClient(citizenToken);
      const otherClient = createClient(otherToken);

      await Promise.all([
        connectClientAsync(citizenClient),
        connectClientAsync(otherClient),
      ]);

      let otherGotNotif = false;
      otherClient.on('notification:new', () => { otherGotNotif = true; });

      const notifPromise = new Promise((resolve) => citizenClient.once('notification:new', resolve));

      await createNotification({
        userId: citizenUser._id,
        type: 'STATUS_CHANGED',
        title: 'Status Updated',
        message: 'Your request has been accepted.',
      });

      const notifData = await notifPromise;
      expect(notifData.title).toBe('Status Updated');
      expect(notifData.type).toBe('STATUS_CHANGED');

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(otherGotNotif).toBe(false);
    });
  });

  describe('4. Responder Disconnect Grace Period', () => {
    it('sets responder OFFLINE after grace period expires', async () => {
      const respClient = createClient(onlineRespToken);
      await connectClientAsync(respClient);

      // Verify responder is ONLINE in database
      let dbResponder = await User.findById(onlineResponder._id);
      expect(dbResponder.responderProfile.availability).toBe(AVAILABILITY.ONLINE);

      // Disconnect socket
      respClient.disconnect();

      // Immediately after disconnect, availability should still be ONLINE (grace period active)
      dbResponder = await User.findById(onlineResponder._id);
      expect(dbResponder.responderProfile.availability).toBe(AVAILABILITY.ONLINE);

      // Wait for test grace period (500ms + margin)
      await new Promise((resolve) => setTimeout(resolve, 650));

      // Now responder should be OFFLINE
      dbResponder = await User.findById(onlineResponder._id);
      expect(dbResponder.responderProfile.availability).toBe(AVAILABILITY.OFFLINE);
    });

    it('reconnecting within grace period preserves ONLINE status', async () => {
      const respClient1 = createClient(onlineRespToken);
      await connectClientAsync(respClient1);

      // Disconnect
      respClient1.disconnect();

      // Reconnect after 150ms (well within 500ms grace period)
      await new Promise((resolve) => setTimeout(resolve, 150));
      const respClient2 = createClient(onlineRespToken);
      await connectClientAsync(respClient2);

      // Wait past the original 500ms grace period
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Responder should still be ONLINE
      const dbResponder = await User.findById(onlineResponder._id);
      expect(dbResponder.responderProfile.availability).toBe(AVAILABILITY.ONLINE);
    });
  });
});
