// ============================================================
// Notification Service
// Records notification attempts in the database and delegates
// to channel-specific senders (email, SMS, push).
//
// NOTE: The actual email / SMS sending functions are stubs.
// Replace them with real providers (e.g. Nodemailer, Twilio,
// Firebase Cloud Messaging) when ready for production.
// ============================================================
import { supabase } from '../config/supabase.js';

/**
 * Create a notification record and attempt to deliver it.
 *
 * @param {object} opts
 * @param {string} opts.user_id   – recipient user UUID
 * @param {string} opts.alert_id  – related alert UUID (optional)
 * @param {string} opts.channel   – 'email' | 'sms' | 'push'
 * @param {string} opts.message   – human-readable message body
 */
async function sendNotification({ user_id, alert_id, channel, message }) {
    try {
        // 1. insert a pending notification row
        const { data: notification, error: insertErr } = await supabase
            .from('notifications')
            .insert({
                user_id,
                alert_id: alert_id || null,
                channel,
                message,
                status: 'pending',
            })
            .select()
            .single();

        if (insertErr) {
            console.error('[NotificationService] Insert failed:', insertErr.message);
            return null;
        }

        // 2. attempt delivery through the appropriate channel
        let delivered = false;
        switch (channel) {
            case 'email':
                delivered = await sendEmail(user_id, message);
                break;
            case 'sms':
                delivered = await sendSMS(user_id, message);
                break;
            case 'push':
                delivered = await sendPush(user_id, message);
                break;
            default:
                console.warn(`[NotificationService] Unknown channel: ${channel}`);
        }

        // 3. update the notification status
        const newStatus = delivered ? 'sent' : 'failed';
        await supabase
            .from('notifications')
            .update({
                status: newStatus,
                sent_at: delivered ? new Date().toISOString() : null,
            })
            .eq('id', notification.id);

        console.log(`[NotificationService] ${channel} → ${newStatus} (user: ${user_id})`);
        return notification;
    } catch (err) {
        console.error('[NotificationService] Error:', err.message);
        return null;
    }
}

// ============================================================
// Channel stubs — replace with real implementations
// ============================================================

/**
 * Send an email to a user.
 * TODO: integrate Nodemailer, SendGrid, Resend, etc.
 */
async function sendEmail(userId, message) {
    console.log(`[Email Stub] Would send email to user ${userId}: ${message}`);
    // return true when real provider is wired up
    return true;
}

/**
 * Send an SMS to a user.
 * TODO: integrate Twilio, Africa's Talking, etc.
 */
async function sendSMS(userId, message) {
    console.log(`[SMS Stub] Would send SMS to user ${userId}: ${message}`);
    return true;
}

/**
 * Send a push notification to a user.
 * TODO: integrate Firebase Cloud Messaging, OneSignal, etc.
 */
async function sendPush(userId, message) {
    console.log(`[Push Stub] Would send push to user ${userId}: ${message}`);
    return true;
}

export { sendNotification };
