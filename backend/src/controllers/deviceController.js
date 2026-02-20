// ============================================================
// Device Controller (Sensor Readings)
// Handles HTTP requests from ESP32 devices.
// Receives sensor payloads, stores them, updates the parent
// bin's fill level, and triggers the alert evaluation engine.
// ============================================================
import { supabase } from '../config/supabase.js';
import { evaluateReading } from '../services/alertService.js';
import { emitSensorReading } from '../services/websocketService.js';

/**
 * POST /api/devices/data
 * Receive a sensor data payload from an ESP32 smart bin.
 *
 * Expected body:
 * {
 *   bin_code:      "BIN-001",       // unique code printed on the bin
 *   fill_level:    72,              // ultrasonic sensor (0-100 %)
 *   waste_type:    "organic",       // IR classification (optional)
 *   weight:        3.5,             // load cell in kg (optional)
 *   gas_level:     120.5,           // gas sensor in ppm (optional)
 *   temperature:   28.3,            // °C (optional)
 *   moisture:      65.2,            // moisture sensor % (optional)
 *   battery_level: 85               // ESP32 battery % (optional)
 * }
 */
const receiveSensorData = async (req, res) => {
    try {
        const {
            bin_code,
            fill_level,
            waste_type,
            weight,
            gas_level,
            temperature,
            moisture,
            battery_level,
        } = req.body;

        // ---- validate required fields --------------------------
        if (!bin_code || fill_level === undefined) {
            return res.status(400).json({
                error: 'bin_code and fill_level are required.',
            });
        }

        if (fill_level < 0 || fill_level > 100) {
            return res.status(400).json({
                error: 'fill_level must be between 0 and 100.',
            });
        }

        // ---- look up the bin by its unique code ----------------
        const { data: bin, error: binErr } = await supabase
            .from('bins')
            .select('id')
            .eq('bin_code', bin_code)
            .single();

        if (binErr || !bin) {
            return res.status(404).json({
                error: `Bin with code "${bin_code}" not found.`,
            });
        }

        // ---- insert the sensor reading -------------------------
        const { data: reading, error: readingErr } = await supabase
            .from('sensor_readings')
            .insert({
                bin_id: bin.id,
                fill_level,
                waste_type: waste_type || null,
                weight: weight || null,
                gas_level: gas_level || null,
                temperature: temperature || null,
                moisture: moisture || null,
                battery_level: battery_level || null,
            })
            .select()
            .single();

        if (readingErr) {
            console.error('[DeviceController] Insert reading error:', readingErr.message);
            return res.status(500).json({ error: readingErr.message });
        }

        // ---- update the bin's current fill level ---------------
        await supabase
            .from('bins')
            .update({ fill_level })
            .eq('id', bin.id);

        // ---- emit real-time update over WebSocket --------------
        emitSensorReading(reading);

        // ---- run the alert evaluation engine -------------------
        const alerts = await evaluateReading(reading);

        // ---- respond to the ESP32 -----------------------------
        res.status(201).json({
            message: 'Sensor data received successfully.',
            reading,
            alerts_generated: alerts.length,
        });
    } catch (error) {
        console.error('[DeviceController] Unexpected error:', error.message);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * GET /api/devices/readings
 * Retrieve sensor readings with optional filters.
 *
 * Query params:
 *   bin_id  – filter by bin UUID
 *   limit   – max rows (default 50)
 *   offset  – pagination offset
 */
const getReadings = async (req, res) => {
    try {
        const { bin_id, limit = 50, offset = 0 } = req.query;

        let query = supabase
            .from('sensor_readings')
            .select('*')
            .order('created_at', { ascending: false })
            .range(Number(offset), Number(offset) + Number(limit) - 1);

        // optionally filter by bin
        if (bin_id) {
            query = query.eq('bin_id', bin_id);
        }

        const { data, error } = await query;

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.status(200).json({ readings: data });
    } catch (error) {
        console.error('[DeviceController] getReadings error:', error.message);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * GET /api/devices/readings/:id
 * Retrieve a single sensor reading by its UUID.
 */
const getReadingById = async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('sensor_readings')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Reading not found.' });
        }

        res.status(200).json({ reading: data });
    } catch (error) {
        console.error('[DeviceController] getReadingById error:', error.message);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

export { receiveSensorData, getReadings, getReadingById };