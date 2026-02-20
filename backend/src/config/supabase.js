// importing the supabase client
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// load environment variables from .env file
dotenv.config();

// creating the supabase client using the URL and KEY from env fle
const supabaseUrl = process.env.SUPABASE_url;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// validating the connection to supabase
async function validateSupabaseConnection() {
    if (!supabaseUrl || !supabaseKey) {
        console.error('Supabase URL or Key is missing. Please check your environment variables.');
        process.exit(1);
    }

    try {
        const { data, error } = await supabase.from('test_table').select('*').limit(1);
        if (error) {
            throw error;
        }
        console.log('Successfully connected to Supabase!');
    } catch (error) {
        console.error('Error connecting to Supabase:', error.message);
        process.exit(1);
    }
}

export default supabase;