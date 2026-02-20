// ============================================================
// WebSocket Service
// Manages real-time communication between the backend and
// connected dashboard clients using Socket.IO.
// ============================================================
import { Server } from 'socket.io';

// holds the single Socket.IO server instance
let io = null;

/**
 * Initialise Socket.IO and attach it to the HTTP server.
 * Called once from server.js after the Express app starts listening.
 *
 * @param {import('http').Server} httpServer – the Node HTTP server
 * @returns {import('socket.io').Server} the Socket.IO instance
 */
function initWebSocket(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: '*',                // allow all origins (restrict in production)
            methods: ['GET', 'POST'],
        },
    });

    // fires when a new dashboard client connects
    io.on('connection', (socket) => {
        console.log(`[WebSocket] Client connected: ${socket.id}`);

        // optional: client can subscribe to a specific bin's updates
        socket.on('subscribe_bin', (binId) => {
            socket.join(`bin_${binId}`);
            console.log(`[WebSocket] ${socket.id} subscribed to bin_${binId}`);
        });

        // optional: client can unsubscribe from a bin
        socket.on('unsubscribe_bin', (binId) => {
            socket.leave(`bin_${binId}`);
            console.log(`[WebSocket] ${socket.id} unsubscribed from bin_${binId}`);
        });

        socket.on('disconnect', () => {
            console.log(`[WebSocket] Client disconnected: ${socket.id}`);
        });
    });

    console.log('[WebSocket] Socket.IO initialised');
    return io;
}

/**
 * Return the current Socket.IO instance.
 * Will be null if initWebSocket has not been called yet.
 */
function getIO() {
    return io;
}

/**
 * Emit a new sensor reading to every connected client and
 * to the room for the specific bin.
 *
 * @param {object} reading – the sensor reading row
 */
function emitSensorReading(reading) {
    if (!io) return;
    // broadcast to everyone
    io.emit('sensor_reading', reading);
    // broadcast to bin-specific room
    io.to(`bin_${reading.bin_id}`).emit('bin_update', reading);
}

/**
 * Emit a new alert to all connected dashboard clients.
 *
 * @param {object} alert – the alert row
 */
function emitAlert(alert) {
    if (!io) return;
    io.emit('new_alert', alert);
    io.to(`bin_${alert.bin_id}`).emit('bin_alert', alert);
}

/**
 * Emit a bin status change (e.g. after collection empties a bin).
 *
 * @param {object} bin – the updated bin row
 */
function emitBinStatusUpdate(bin) {
    if (!io) return;
    io.emit('bin_status_update', bin);
    io.to(`bin_${bin.id}`).emit('bin_update', bin);
}

export {
    initWebSocket,
    getIO,
    emitSensorReading,
    emitAlert,
    emitBinStatusUpdate,
};
