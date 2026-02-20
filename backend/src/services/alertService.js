// ============================================================
// Alert Service
// Contains the threshold-checking logic that runs every time
// a new sensor reading arrives. Creates alerts in the database
// and triggers real-time + notification events.
// ============================================================
import { supabase } from '../config/supabase.js';
import { emitAlert } from './websocketService.js';
import { sendNotification } from './notificationService.js';

// ----- configurable thresholds --------------------------------
const THRESHOLDS = {
    fill: {
        warning: 50,    // fill_level >= 50%  → orange / medium
        critical: 80,   // fill_level >= 80%  → red    / high
        flash: 95,      // fill_level >= 95%  → flash  / critical
    },
    gas: {
        warning: 200,   // ppm
        critical: 500,
    },
    temperature: {
        warning: 45,    // °C
        critical: 60,
    },
    battery: {
        warning: 20,    // %
        critical: 10,
    },
};

/**
 * Evaluate a single sensor reading against all thresholds.
 * Inserts alert rows and emits events for every threshold breached.
 *
 * @param {object} reading – a row from the sensor_readings table
 * @returns {object[]} array of created alert objects (may be empty)
 */
async function evaluateReading(reading) {
    const alerts = [];

    // --- Fill-level alerts ----------------------------------
    if (reading.fill_level >= THRESHOLDS.fill.flash) {
        alerts.push(buildAlert(reading, 'fill_critical', 'critical',
            `Bin is ${reading.fill_level}% full — FLASH ALERT! Immediate collection required.`));
    } else if (reading.fill_level >= THRESHOLDS.fill.critical) {
        alerts.push(buildAlert(reading, 'fill_critical', 'high',
            `Bin is ${reading.fill_level}% full — approaching capacity.`));
    } else if (reading.fill_level >= THRESHOLDS.fill.warning) {
        alerts.push(buildAlert(reading, 'fill_warning', 'medium',
            `Bin is ${reading.fill_level}% full — schedule collection soon.`));
    }

    // --- Gas-level alerts -----------------------------------
    if (reading.gas_level != null) {
        if (reading.gas_level >= THRESHOLDS.gas.critical) {
            alerts.push(buildAlert(reading, 'gas_detected', 'critical',
                `Dangerous gas level detected: ${reading.gas_level} ppm.`));
        } else if (reading.gas_level >= THRESHOLDS.gas.warning) {
            alerts.push(buildAlert(reading, 'gas_detected', 'high',
                `Elevated gas level detected: ${reading.gas_level} ppm.`));
        }
    }

    // --- Temperature alerts ---------------------------------
    if (reading.temperature != null) {
        if (reading.temperature >= THRESHOLDS.temperature.critical) {
            alerts.push(buildAlert(reading, 'maintenance_needed', 'critical',
                `Extreme temperature detected: ${reading.temperature}°C.`));
        } else if (reading.temperature >= THRESHOLDS.temperature.warning) {
            alerts.push(buildAlert(reading, 'maintenance_needed', 'high',
                `High temperature detected: ${reading.temperature}°C.`));
        }
    }

    // --- Battery alerts -------------------------------------
    if (reading.battery_level != null) {
        if (reading.battery_level <= THRESHOLDS.battery.critical) {
            alerts.push(buildAlert(reading, 'maintenance_needed', 'critical',
                `Battery critically low: ${reading.battery_level}%.`));
        } else if (reading.battery_level <= THRESHOLDS.battery.warning) {
            alerts.push(buildAlert(reading, 'maintenance_needed', 'medium',
                `Battery low: ${reading.battery_level}%.`));
        }
    }

    // --- Persist alerts & notify ----------------------------
    if (alerts.length > 0) {
        const { data, error } = await supabase
            .from('alerts')
            .insert(alerts)
            .select();

        if (error) {
            console.error('[AlertService] Failed to insert alerts:', error.message);
            return [];
        }

        // emit each alert over WebSocket and send notifications
        for (const alert of data) {
            emitAlert(alert);
            // send notifications to admins & collectors for high/critical alerts
            if (['high', 'critical'].includes(alert.severity)) {
                await notifyRelevantUsers(alert);
            }
        }

        return data;
    }

    return [];
}

// ----- helpers ------------------------------------------------

/**
 * Build an alert object ready for Supabase insertion.
 */
function buildAlert(reading, alertType, severity, message) {
    return {
        bin_id: reading.bin_id,
        alert_type: alertType,
        severity,
        message,
        resolved: false,
    };
}

/**
 * Look up admin + collector users and send them a notification
 * for the given alert.
 */
async function notifyRelevantUsers(alert) {
    try {
        // fetch active admins and collectors
        const { data: users, error } = await supabase
            .from('users')
            .select('id, email, phone, role')
            .in('role', ['admin', 'collector'])
            .eq('is_active', true);

        if (error || !users) return;

        for (const user of users) {
            // send email notification
            if (user.email) {
                await sendNotification({
                    user_id: user.id,
                    alert_id: alert.id,
                    channel: 'email',
                    message: alert.message,
                });
            }
            // send SMS notification for critical alerts
            if (user.phone && alert.severity === 'critical') {
                await sendNotification({
                    user_id: user.id,
                    alert_id: alert.id,
                    channel: 'sms',
                    message: alert.message,
                });
            }
        }
    } catch (err) {
        console.error('[AlertService] Failed to notify users:', err.message);
    }
}

export { evaluateReading, THRESHOLDS };
