// ============================================================
// Users Controller
// CRUD operations for admin, collector, and operator accounts.
// ============================================================
import { supabase } from '../config/supabase.js';

/**
 * GET /api/users
 * List all users (admin only in production — enforce via RLS/middleware).
 *
 * Query params:
 *   role      – 'admin' | 'collector' | 'operator'
 *   is_active – 'true' | 'false'
 *   limit     – max rows (default 50)
 *   offset    – pagination offset
 */
const getUsers = async (req, res) => {
    try {
        const { role, is_active, limit = 50, offset = 0 } = req.query;

        let query = supabase
            .from('users')
            .select('id, email, full_name, phone, role, is_active, created_at')
            .order('created_at', { ascending: false })
            .range(Number(offset), Number(offset) + Number(limit) - 1);

        if (role) query = query.eq('role', role);
        if (is_active !== undefined) query = query.eq('is_active', is_active === 'true');

        const { data, error } = await query;

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.status(200).json({ users: data });
    } catch (error) {
        console.error('[UsersController] getUsers error:', error.message);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * GET /api/users/:id
 * Retrieve a single user by UUID.
 */
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('users')
            .select('id, email, full_name, phone, role, avatar_url, is_active, created_at')
            .eq('id', id)
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.status(200).json({ user: data });
    } catch (error) {
        console.error('[UsersController] getUserById error:', error.message);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * POST /api/users
 * Create a new user account.
 *
 * Body:
 * {
 *   email:     "collector@example.com",
 *   full_name: "John Doe",
 *   phone:     "+254712345678",   // optional
 *   role:      "collector"        // optional, defaults to 'collector'
 * }
 */
const createUser = async (req, res) => {
    try {
        const { email, full_name, phone, role } = req.body;

        if (!email || !full_name) {
            return res.status(400).json({
                error: 'email and full_name are required.',
            });
        }

        const { data, error } = await supabase
            .from('users')
            .insert({
                email,
                full_name,
                phone: phone || null,
                role: role || 'collector',
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return res.status(409).json({ error: 'A user with this email already exists.' });
            }
            return res.status(500).json({ error: error.message });
        }

        res.status(201).json({ message: 'User created successfully.', user: data });
    } catch (error) {
        console.error('[UsersController] createUser error:', error.message);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * PATCH /api/users/:id
 * Update an existing user's details.
 */
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const { data, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'User not found or update failed.' });
        }

        res.status(200).json({ message: 'User updated successfully.', user: data });
    } catch (error) {
        console.error('[UsersController] updateUser error:', error.message);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * DELETE /api/users/:id
 * Remove a user from the system.
 */
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', id);

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.status(200).json({ message: 'User deleted successfully.' });
    } catch (error) {
        console.error('[UsersController] deleteUser error:', error.message);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

export { getUsers, getUserById, createUser, updateUser, deleteUser };
