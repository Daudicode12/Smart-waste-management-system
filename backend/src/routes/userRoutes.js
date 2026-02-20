// ============================================================
// User Routes
// CRUD endpoints for managing user accounts.
// ============================================================
import express from 'express';
import {
    getUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
} from '../controllers/userController.js';

const router = express.Router();

// GET /api/users — list all users (optional ?role=&is_active=)
router.get('/', getUsers);

// GET /api/users/:id — get a single user
router.get('/:id', getUserById);

// POST /api/users — create a new user
router.post('/', createUser);

// PATCH /api/users/:id — update a user
router.patch('/:id', updateUser);

// DELETE /api/users/:id — delete a user
router.delete('/:id', deleteUser);

export default router;
