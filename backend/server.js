// import necessary modules
import app from './src/app.js';
import { supabase, validateSupabaseConnection } from './src/config/supabase.js';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// loading environment variables from .env file
dotenv.config();

// creating an iinstance of express app

// using middleware to perse JSON data and enable CORS
app.use(express.json());
app.use(cors());

// validating the connection to supabase before starting the server
validateSupabaseConnection().then(() => {
    const port = process.env.PORT;
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}).catch(error => {
    console.error('Failed to start server:', error.message);
    process.exit(1);
});