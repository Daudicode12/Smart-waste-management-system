// ============================================================
// Alerts Controller
// Retrieve, resolve, and manage system-generated alerts.
// ============================================================
import { supabase } from '../config/supabase.js';

/**
 * GET /api/alerts
 * List alerts with optional filters.
 *
 * Query params:
 *   bin_id    – filter by bin UUID
 *   resolved  – 'true' | 'false'
 *   severity  – 'low' | 'medium' | 'high' | 'critical'
 *   limit     – max rows (default 50)
 *   offset    – pagination offset
 */
const getAlerts = async (req, res) => {
    try {
        const { bin_id, resolved, severity, limit = 50, offset = 0 } = req.query;

        let query = supabase
            .from('alerts')
            .select('*, bins(bin_code, location)')   // join bin info
            .order('created_at', { ascending: false })
            .range(Number(offset), Number(offset) + Number(limit) - 1);

        if (bin_id) query = query.eq('bin_id', bin_id);
        if (resolved !== undefined) query = query.eq('resolved', resolved === 'true');
        if (severity) query = query.eq('severity', severity);

        const { data, error } = await query;

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.status(200).json({ alerts: data });
    } catch (error) {
        console.error('[AlertsController] getAlerts error:', error.message);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * GET /api/alerts/:id
 * Retrieve a single alert by UUID.
 */
const getAlertById = async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('alerts')
            .select('*, bins(bin_code, location)')
            .eq('id', id)
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Alert not found.' });
        }

        res.status(200).json({ alert: data });
    } catch (error) {
        console.error('[AlertsController] getAlertById error:', error.message);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * PATCH /api/alerts/:id
 * Resolve (or update) an alert.
 *
 * Body:
 * {
 *   resolved:    true,
 *   resolved_by: "<user-uuid>"   // optional
 * }
 */
const resolveAlert = async (req, res) => {
    try {
        const { id } = req.params;
        const { resolved, resolved_by } = req.body;

        const updatePayload = {};
        if (resolved !== undefined) {
            updatePayload.resolved = resolved;
            updatePayload.resolved_at = resolved ? new Date().toISOString() : null;
        }
        if (resolved_by) {
            updatePayload.resolved_by = resolved_by;
        }

        const { data, error } = await supabase
            .from('alerts')
            .update(updatePayload)
            .eq('id', id)
            .select()
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Alert not found or update failed.' });
        }

        res.status(200).json({ message: 'Alert updated successfully.', alert: data });
    } catch (error) {
        console.error('[AlertsController] resolveAlert error:', error.message);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * DELETE /api/alerts/:id
 * Permanently delete an alert (admin only).
 */
const deleteAlert = async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('alerts')
            .delete()
            .eq('id', id);

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.status(200).json({ message: 'Alert deleted successfully.' });
    } catch (error) {
        console.error('[AlertsController] deleteAlert error:', error.message);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * GET /api/alerts/stats/overview
 * Summary stats: total, unresolved, by severity, by type.
 */
const getAlertStats = async (req, res) => {
    try {
        const { data: alerts, error } = await supabase
            .from('alerts')
            .select('id, severity, alert_type, resolved');

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        const total = alerts.length;
        const unresolved = alerts.filter(a => !a.resolved).length;

        // count by severity
        const bySeverity = alerts.reduce((acc, a) => {
            acc[a.severity] = (acc[a.severity] || 0) + 1;
            return acc;
        }, {});

        // count by alert type
        const byType = alerts.reduce((acc, a) => {
            acc[a.alert_type] = (acc[a.alert_type] || 0) + 1;
            return acc;
        }, {});

        res.status(200).json({
            total_alerts: total,
            unresolved,
            by_severity: bySeverity,
            by_type: byType,
        });
    } catch (error) {
        console.error('[AlertsController] getAlertStats error:', error.message);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

export {
    getAlerts,
    getAlertById,
    resolveAlert,
    deleteAlert,
    getAlertStats,
};
