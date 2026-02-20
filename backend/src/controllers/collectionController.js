// ============================================================
// Collections Controller
// Handles bin collection / emptying events logged by waste
// collectors through the dashboard or mobile app.
// ============================================================
import { supabase } from '../config/supabase.js';
import { emitBinStatusUpdate } from '../services/websocketService.js';

/**
 * POST /api/collections
 * Log a new collection event — marks a bin as emptied.
 *
 * Body:
 * {
 *   bin_id:       "<bin-uuid>",
 *   collected_by: "<user-uuid>",     // optional
 *   notes:        "Bin was overflowing"  // optional
 * }
 */
const createCollection = async (req, res) => {
    try {
        const { bin_id, collected_by, notes } = req.body;

        if (!bin_id) {
            return res.status(400).json({ error: 'bin_id is required.' });
        }

        // ---- fetch the bin's current fill level ----------------
        const { data: bin, error: binErr } = await supabase
            .from('bins')
            .select('id, fill_level')
            .eq('id', bin_id)
            .single();

        if (binErr || !bin) {
            return res.status(404).json({ error: 'Bin not found.' });
        }

        // ---- insert the collection log -------------------------
        const { data: log, error: logErr } = await supabase
            .from('collection_logs')
            .insert({
                bin_id,
                collected_by: collected_by || null,
                fill_level_before: bin.fill_level,
                fill_level_after: 0,
                notes: notes || null,
            })
            .select()
            .single();

        if (logErr) {
            console.error('[CollectionsController] Insert error:', logErr.message);
            return res.status(500).json({ error: logErr.message });
        }

        // ---- reset the bin's fill level and update last_emptied -
        const { data: updatedBin } = await supabase
            .from('bins')
            .update({
                fill_level: 0,
                last_emptied: new Date().toISOString(),
            })
            .eq('id', bin_id)
            .select()
            .single();

        // ---- resolve any open alerts for this bin --------------
        await supabase
            .from('alerts')
            .update({
                resolved: true,
                resolved_at: new Date().toISOString(),
                resolved_by: collected_by || null,
            })
            .eq('bin_id', bin_id)
            .eq('resolved', false);

        // ---- notify dashboards via WebSocket -------------------
        if (updatedBin) {
            emitBinStatusUpdate(updatedBin);
        }

        res.status(201).json({
            message: 'Collection logged successfully.',
            collection: log,
        });
    } catch (error) {
        console.error('[CollectionsController] createCollection error:', error.message);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * GET /api/collections
 * Retrieve collection history with optional filters.
 *
 * Query params:
 *   bin_id       – filter by bin UUID
 *   collected_by – filter by collector user UUID
 *   limit        – max rows (default 50)
 *   offset       – pagination offset
 */
const getCollections = async (req, res) => {
    try {
        const { bin_id, collected_by, limit = 50, offset = 0 } = req.query;

        let query = supabase
            .from('collection_logs')
            .select('*, bins(bin_code, location), users(full_name)')
            .order('collected_at', { ascending: false })
            .range(Number(offset), Number(offset) + Number(limit) - 1);

        if (bin_id) query = query.eq('bin_id', bin_id);
        if (collected_by) query = query.eq('collected_by', collected_by);

        const { data, error } = await query;

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.status(200).json({ collections: data });
    } catch (error) {
        console.error('[CollectionsController] getCollections error:', error.message);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * GET /api/collections/:id
 * Retrieve a single collection log by UUID.
 */
const getCollectionById = async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('collection_logs')
            .select('*, bins(bin_code, location), users(full_name)')
            .eq('id', id)
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Collection log not found.' });
        }

        res.status(200).json({ collection: data });
    } catch (error) {
        console.error('[CollectionsController] getCollectionById error:', error.message);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

export { createCollection, getCollections, getCollectionById };
