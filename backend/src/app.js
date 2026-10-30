import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import env from './config/env.js';
import notFound from './middleware/notFound.js';
import errorMiddleware from './middleware/errorMiddleware.js';
import { successResponse } from './utils/apiResponse.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import incidentRoutes from './routes/incidentRoutes.js';
import responderRoutes from './routes/responderRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import placesRoutes from './routes/placesRoutes.js';

const app = express();

// 1. Security Headers
app.use(helmet());

// 2. CORS configuration (supports development ports like 5173, 5174, with credentials for httpOnly cookies)
const allowedOrigins = [
  env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        (env.NODE_ENV === 'development' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))
      ) {
        return callback(null, true);
      }
      return callback(new Error('Blocked by CORS policy'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);


// 3. HTTP Request Logging (silent during tests)
if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// 4. Body parsing with strict payload size limit
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 5. Cookie parsing
app.use(cookieParser());

// 6. Base Health Check endpoint
app.get('/api/health', (req, res) => {
  successResponse(res, 200, 'CrisisConnect backend operational', {
    status: 'UP',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// 7. API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/responders', responderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/places', placesRoutes);

// 8. 404 Handler for undefined routes
app.use(notFound);

// 9. Centralized Error Handler (must be registered last)
app.use(errorMiddleware);

export default app;
