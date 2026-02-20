import express from 'express';
import { receiveSensorData } from '../controllers/deviceController.js';

const router = express.Router();

// router for receiving sensor data from devices
router.post("/data", receiveSensorData);

export default router;