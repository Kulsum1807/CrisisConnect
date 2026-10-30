import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { jest } from '@jest/globals';
import app from '../src/app.js';
import User from '../src/models/User.js';
import { ROLES } from '../src/constants/roles.js';
import { generateAccessToken } from '../src/utils/token.js';
import { clearPlacesCache } from '../src/services/placesService.js';

let mongoServer;

const createAuthCookie = (user) => {
  const token = generateAccessToken({ userId: user._id.toString(), role: user.role });
  return `accessToken=${token}`;
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  clearPlacesCache();
  jest.restoreAllMocks();
});

describe('Nearby Help (Places) API Tests (/api/places/nearby)', () => {
  let user, userCookie;

  beforeEach(async () => {
    user = await User.create({
      name: 'John Citizen',
      email: 'john.citizen@example.com',
      phone: '9876543210',
      password: 'HashedPassword123!',
      role: ROLES.USER,
    });
    userCookie = createAuthCookie(user);
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/places/nearby?lat=12.9716&lng=77.5946');
    expect(res.status).toBe(401);
  });

  it('rejects invalid parameters with 400 VALIDATION_ERROR', async () => {
    // 1. Missing lat/lng
    const res1 = await request(app)
      .get('/api/places/nearby')
      .set('Cookie', [userCookie]);
    expect(res1.status).toBe(400);

    // 2. Latitude out of range (> 90)
    const res2 = await request(app)
      .get('/api/places/nearby?lat=95&lng=77.5946')
      .set('Cookie', [userCookie]);
    expect(res2.status).toBe(400);

    // 3. Longitude out of range (< -180)
    const res3 = await request(app)
      .get('/api/places/nearby?lat=12.9716&lng=-190')
      .set('Cookie', [userCookie]);
    expect(res3.status).toBe(400);

    // 4. Radius exceeding 10000m
    const res4 = await request(app)
      .get('/api/places/nearby?lat=12.9716&lng=77.5946&radius=15000')
      .set('Cookie', [userCookie]);
    expect(res4.status).toBe(400);

    // 5. Invalid type
    const res5 = await request(app)
      .get('/api/places/nearby?lat=12.9716&lng=77.5946&type=fire_station')
      .set('Cookie', [userCookie]);
    expect(res5.status).toBe(400);
  });

  it('successfully fetches and maps Overpass elements (nodes and ways with center)', async () => {
    const mockElements = [
      {
        type: 'node',
        id: 101,
        lat: 12.972,
        lon: 77.595,
        tags: {
          amenity: 'hospital',
          name: 'City Care Hospital',
          phone: '+91-80-11223344',
        },
      },
      {
        type: 'way',
        id: 202,
        center: { lat: 12.975, lon: 77.597 },
        tags: {
          amenity: 'police',
          name: 'Central Police Station',
          'contact:phone': '100',
        },
      },
      {
        type: 'node',
        id: 303,
        lat: 12.979,
        lon: 77.599,
        tags: {
          amenity: 'hospital',
          // name missing to test fallback
        },
      },
    ];

    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ elements: mockElements }),
    });

    const res = await request(app)
      .get('/api/places/nearby?lat=12.9716&lng=77.5946&radius=5000&type=all')
      .set('Cookie', [userCookie]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const places = res.body.data.places;
    expect(places).toHaveLength(3);

    // Verify node mapping
    expect(places[0]).toMatchObject({
      id: '101',
      type: 'hospital',
      name: 'City Care Hospital',
      lat: 12.972,
      lng: 77.595,
      phone: '+91-80-11223344',
    });
    expect(typeof places[0].distanceMeters).toBe('number');

    // Verify way mapping with center coordinates
    expect(places[1]).toMatchObject({
      id: '202',
      type: 'police',
      name: 'Central Police Station',
      lat: 12.975,
      lng: 77.597,
      phone: '100',
    });

    // Verify fallback name for unnamed hospital
    expect(places[2].name).toBe('Unnamed hospital');
  });

  it('correctly sorts places by distanceMeters ascending and caps at 20', async () => {
    // Generate 25 places at varying distances
    const mockElements = Array.from({ length: 25 }, (_, i) => ({
      type: 'node',
      id: 1000 + i,
      lat: 12.9716 + (25 - i) * 0.001, // reverse order so earlier indices are farther
      lon: 77.5946,
      tags: {
        amenity: 'hospital',
        name: `Hospital #${i}`,
      },
    }));

    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ elements: mockElements }),
    });

    const res = await request(app)
      .get('/api/places/nearby?lat=12.9716&lng=77.5946&radius=5000')
      .set('Cookie', [userCookie]);

    expect(res.status).toBe(200);
    const places = res.body.data.places;

    // Must be capped at 20
    expect(places.length).toBe(20);

    // Must be strictly sorted ascending
    for (let i = 0; i < places.length - 1; i++) {
      expect(places[i].distanceMeters).toBeLessThanOrEqual(places[i + 1].distanceMeters);
    }
  });

  it('serves from in-memory cache on subsequent requests with same 3-decimal coords', async () => {
    const mockElements = [
      {
        type: 'node',
        id: 501,
        lat: 12.972,
        lon: 77.595,
        tags: { amenity: 'hospital', name: 'Cached Hospital' },
      },
    ];

    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ elements: mockElements }),
    });

    // First request (lat: 12.9716 -> 12.972, lng: 77.5946 -> 77.595)
    const res1 = await request(app)
      .get('/api/places/nearby?lat=12.9716&lng=77.5946&radius=5000&type=all')
      .set('Cookie', [userCookie]);
    expect(res1.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Second request with slightly shifted coords that round to same 3 decimals
    const res2 = await request(app)
      .get('/api/places/nearby?lat=12.9718&lng=77.5947&radius=5000&type=all')
      .set('Cookie', [userCookie]);
    expect(res2.status).toBe(200);

    // Fetch should NOT have been called again (cache hit)
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(res2.body.data.places[0].name).toBe('Cached Hospital');
  });

  it('returns 503 SERVICE_UNAVAILABLE when Overpass API times out or fails', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('The operation was aborted due to timeout'));

    const res = await request(app)
      .get('/api/places/nearby?lat=12.9716&lng=77.5946')
      .set('Cookie', [userCookie]);

    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('SERVICE_UNAVAILABLE');
    expect(res.body.message).toMatch(/temporarily unavailable/i);
  });
});
