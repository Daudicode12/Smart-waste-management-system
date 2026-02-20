// ============================================================
// Bin Routes
// CRUD endpoints for managing smart waste bins.
// ============================================================
import express from 'express';
import {
    getAllBins,
    getBinById,
    createBin,
    updateBin,
    deleteBin,
    getBinStats,
} from '../controllers/binController.js';

const router = express.Router();

// GET /api/bins/stats/overview — dashboard summary stats
// (defined before /:id so it doesn't get caught by the param route)
router.get('/stats/overview', getBinStats);

// GET /api/bins — list all bins (optional ?status=&bin_type=&limit=&offset=)
router.get('/', getAllBins);

// GET /api/bins/:id — get a single bin with recent readings
router.get('/:id', getBinById);

// POST /api/bins — register a new bin
router.post('/', createBin);

// PATCH /api/bins/:id — update bin details
router.patch('/:id', updateBin);

// DELETE /api/bins/:id — remove a bin
router.delete('/:id', deleteBin);

export default router;
