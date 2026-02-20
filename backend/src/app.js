// importing necessary modules
import express from 'express';
import cors from 'cors';
import supabase from './src/config/supabase.js';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import deviceRoutes from './src/routes/deviceRoutes.js';
import authRoutes from './src/routes/authRoutes.js';
import userRoutes from './src/routes/userRoutes.js';

// loading environment variables from .env file
dotenv.config();

// creating an iinstance of express app
const app = express();

// using middleware to perse JSON data and enable CORS
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('combined'));

// defining routes for devices, authentication, and user management
app.use('/api/devices', deviceRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// exporting the app for use in server.js
export default app;