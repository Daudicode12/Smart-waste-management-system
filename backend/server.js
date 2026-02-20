// ============================================================
// Server Entry Point
// Validates the Supabase connection, starts the HTTP server,
// and initialises the WebSocket layer for real-time updates.
// ============================================================
import http from 'http';
import app from './src/app.js';
import { validateSupabaseConnection } from './src/config/supabase.js';
import { initWebSocket } from './src/services/websocketService.js';
import dotenv from 'dotenv';

// load environment variables from .env file
dotenv.config();

// create a raw HTTP server from the Express app
// (Socket.IO needs the HTTP server, not just Express)
const server = http.createServer(app);

// validate the Supabase connection, then start listening
validateSupabaseConnection().then(() => {

    // initialise Socket.IO on the same HTTP server
    initWebSocket(server);

    const port = process.env.PORT || 3000;
    server.listen(port, () => {
        console.log(`[Server] Running on port ${port}`);
        console.log(`[Server] API:       http://localhost:${port}/api`);
        console.log(`[Server] WebSocket: ws://localhost:${port}`);
    });
}).catch(error => {
    console.error('[Server] Failed to start:', error.message);
    process.exit(1);
});