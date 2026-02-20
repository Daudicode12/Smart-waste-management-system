// ============================================================
// Device Routes
// Endpoints for ESP32 sensor data ingestion and reading queries.
// ============================================================
import express from 'express';
import {
    receiveSensorData,
    getReadings,
    getReadingById,
} from '../controllers/deviceController.js';

const router = express.Router();

// POST /api/devices/data — receive a sensor payload from an ESP32
router.post('/data', receiveSensorData);

// GET /api/devices/readings — list readings (optional ?bin_id=&limit=&offset=)
router.get('/readings', getReadings);

// GET /api/devices/readings/:id — get a single reading by UUID
router.get('/readings/:id', getReadingById);

export default router;