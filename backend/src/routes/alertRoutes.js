// ============================================================
// Alert Routes
// Endpoints for viewing, resolving, and managing alerts.
// ============================================================
import express from 'express';
import {
    getAlerts,
    getAlertById,
    resolveAlert,
    deleteAlert,
    getAlertStats,
} from '../controllers/alertController.js';

const router = express.Router();

// GET /api/alerts/stats/overview — alert summary stats
router.get('/stats/overview', getAlertStats);

// GET /api/alerts — list alerts (optional ?bin_id=&resolved=&severity=&limit=&offset=)
router.get('/', getAlerts);

// GET /api/alerts/:id — get a single alert
router.get('/:id', getAlertById);

// PATCH /api/alerts/:id — resolve or update an alert
router.patch('/:id', resolveAlert);

// DELETE /api/alerts/:id — permanently delete an alert
router.delete('/:id', deleteAlert);

export default router;
