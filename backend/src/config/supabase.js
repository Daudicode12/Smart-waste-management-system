// importing the supabase client
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// load environment variables from .env file
dotenv.config();

// creating the supabase client using the URL and KEY from env fle
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// validating the connection to supabase
async function validateSupabaseConnection() {
    if (!supabaseUrl || !supabaseKey) {
        console.error('Supabase URL or Key is missing. Please check your environment variables.');
        process.exit(1);
    }

    try {
        // attempt a lightweight query to verify the connection
        const { data, error } = await supabase.from('bins').select('id').limit(1);
        if (error) {
            throw error;
        }
        console.log('[Supabase] Successfully connected!');
    } catch (error) {
        console.error('[Supabase] Connection error:', error.message);
        process.exit(1);
    }
}

export { supabase, validateSupabaseConnection };