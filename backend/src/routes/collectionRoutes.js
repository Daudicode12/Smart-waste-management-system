// ============================================================
// Collection Routes
// Endpoints for logging and viewing bin collection events.
// ============================================================
import express from 'express';
import {
    createCollection,
    getCollections,
    getCollectionById,
} from '../controllers/collectionController.js';

const router = express.Router();

// GET /api/collections — list collection history (optional ?bin_id=&collected_by=)
router.get('/', getCollections);

// GET /api/collections/:id — get a single collection log
router.get('/:id', getCollectionById);

// POST /api/collections — log a new bin collection
router.post('/', createCollection);

export default router;
