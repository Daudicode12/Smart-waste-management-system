// ============================================================
// Express Application Setup
// Configures middleware and mounts all API route groups.
// ============================================================
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';

// route imports
import deviceRoutes from './routes/deviceRoutes.js';
import binRoutes from './routes/binRoutes.js';
import alertRoutes from './routes/alertRoutes.js';
import collectionRoutes from './routes/collectionRoutes.js';
import userRoutes from './routes/userRoutes.js';
// import authRoutes from './routes/authRoutes.js';

// loading environment variables from .env file
dotenv.config();

// creating an instance of express app
const app = express();

// ---- global middleware -------------------------------------
app.use(express.json());            // parse JSON request bodies
app.use(cors());                    // enable Cross-Origin Resource Sharing
app.use(helmet());                  // set security-related HTTP headers
app.use(morgan('combined'));        // HTTP request logging

// ---- health check endpoint ---------------------------------
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ---- API route groups --------------------------------------
app.use('/api/devices', deviceRoutes);         // ESP32 sensor data
app.use('/api/bins', binRoutes);               // bin CRUD + stats
app.use('/api/alerts', alertRoutes);           // alerts management
app.use('/api/collections', collectionRoutes); // collection logs
app.use('/api/users', userRoutes);             // user management
// app.use('/api/auth', authRoutes);           // authentication (TODO)

// ---- 404 handler for unknown routes ------------------------
app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found.` });
});

// ---- global error handler ----------------------------------
app.use((err, req, res, _next) => {
    console.error('[App] Unhandled error:', err.message);
    res.status(500).json({ error: 'Internal server error.' });
});

// exporting the app for use in server.js
export default app;