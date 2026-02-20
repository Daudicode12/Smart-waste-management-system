// ============================================================
// Bins Controller
// CRUD operations for managing physical smart waste bins.
// ============================================================
import { supabase } from '../config/supabase.js';
import { emitBinStatusUpdate } from '../services/websocketService.js';

/**
 * GET /api/bins
 * List all bins, optionally filtered by status or bin_type.
 *
 * Query params:
 *   status   – 'active' | 'maintenance' | 'decommissioned'
 *   bin_type – 'general' | 'organic' | 'recyclable' | 'hazardous'
 *   limit    – max rows (default 100)
 *   offset   – pagination offset
 */
const getAllBins = async (req, res) => {
    try {
        const { status, bin_type, limit = 100, offset = 0 } = req.query;

        let query = supabase
            .from('bins')
            .select('*')
            .order('created_at', { ascending: false })
            .range(Number(offset), Number(offset) + Number(limit) - 1);

        // apply optional filters
        if (status) query = query.eq('status', status);
        if (bin_type) query = query.eq('bin_type', bin_type);

        const { data, error } = await query;

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.status(200).json({ bins: data });
    } catch (error) {
        console.error('[BinsController] getAllBins error:', error.message);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * GET /api/bins/:id
 * Retrieve a single bin by UUID, including its latest sensor readings.
 */
const getBinById = async (req, res) => {
    try {
        const { id } = req.params;

        // fetch the bin
        const { data: bin, error: binErr } = await supabase
            .from('bins')
            .select('*')
            .eq('id', id)
            .single();

        if (binErr || !bin) {
            return res.status(404).json({ error: 'Bin not found.' });
        }

        // fetch the 10 most recent readings for this bin
        const { data: readings } = await supabase
            .from('sensor_readings')
            .select('*')
            .eq('bin_id', id)
            .order('created_at', { ascending: false })
            .limit(10);

        res.status(200).json({ bin, recent_readings: readings || [] });
    } catch (error) {
        console.error('[BinsController] getBinById error:', error.message);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * POST /api/bins
 * Register a new smart bin in the system.
 *
 * Body:
 * {
 *   bin_code:  "BIN-001",
 *   location:  "Nairobi CBD, Tom Mboya St",
 *   latitude:  -1.2833,
 *   longitude: 36.8167,
 *   bin_type:  "general"     // optional, defaults to 'general'
 * }
 */
const createBin = async (req, res) => {
    try {
        const { bin_code, location, latitude, longitude, bin_type } = req.body;

        // validate required fields
        if (!bin_code || !location) {
            return res.status(400).json({
                error: 'bin_code and location are required.',
            });
        }

        const { data, error } = await supabase
            .from('bins')
            .insert({
                bin_code,
                location,
                latitude: latitude || null,
                longitude: longitude || null,
                bin_type: bin_type || 'general',
            })
            .select()
            .single();

        if (error) {
            // handle duplicate bin_code
            if (error.code === '23505') {
                return res.status(409).json({ error: 'A bin with this code already exists.' });
            }
            return res.status(500).json({ error: error.message });
        }

        res.status(201).json({ message: 'Bin created successfully.', bin: data });
    } catch (error) {
        console.error('[BinsController] createBin error:', error.message);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * PATCH /api/bins/:id
 * Update an existing bin's details (location, status, type, etc.).
 */
const updateBin = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const { data, error } = await supabase
            .from('bins')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Bin not found or update failed.' });
        }

        // notify connected dashboards about the change
        emitBinStatusUpdate(data);

        res.status(200).json({ message: 'Bin updated successfully.', bin: data });
    } catch (error) {
        console.error('[BinsController] updateBin error:', error.message);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * DELETE /api/bins/:id
 * Remove a bin from the system (cascades to readings, alerts, etc.).
 */
const deleteBin = async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('bins')
            .delete()
            .eq('id', id);

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.status(200).json({ message: 'Bin deleted successfully.' });
    } catch (error) {
        console.error('[BinsController] deleteBin error:', error.message);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * GET /api/bins/stats/overview
 * Dashboard overview: total bins, average fill level, bins by status.
 */
const getBinStats = async (req, res) => {
    try {
        // fetch all bins to compute stats
        const { data: bins, error } = await supabase
            .from('bins')
            .select('id, fill_level, status, bin_type');

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        const totalBins = bins.length;
        const avgFillLevel = totalBins > 0
            ? Math.round(bins.reduce((sum, b) => sum + b.fill_level, 0) / totalBins)
            : 0;

        // count bins by status
        const byStatus = bins.reduce((acc, b) => {
            acc[b.status] = (acc[b.status] || 0) + 1;
            return acc;
        }, {});

        // count bins by fill level bracket for the dashboard
        const fillBrackets = {
            empty: bins.filter(b => b.fill_level < 25).length,       // green
            low: bins.filter(b => b.fill_level >= 25 && b.fill_level < 50).length,
            medium: bins.filter(b => b.fill_level >= 50 && b.fill_level < 80).length,  // orange
            high: bins.filter(b => b.fill_level >= 80 && b.fill_level < 95).length,    // red
            critical: bins.filter(b => b.fill_level >= 95).length,   // flash
        };

        res.status(200).json({
            total_bins: totalBins,
            avg_fill_level: avgFillLevel,
            by_status: byStatus,
            fill_brackets: fillBrackets,
        });
    } catch (error) {
        console.error('[BinsController] getBinStats error:', error.message);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

export {
    getAllBins,
    getBinById,
    createBin,
    updateBin,
    deleteBin,
    getBinStats,
};
