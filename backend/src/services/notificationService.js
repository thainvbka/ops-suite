const pool = require("../config/db");

/**
 * Notification Service
 * Handles sending notifications through various channels
 */

class NotificationService {
    /**
     * Send notification to a channel
     * @param {Object} channel - Notification channel config from DB
     * @param {Object} payload - Alert data
     */
    async sendNotification(channel, payload) {
        if (!channel.is_enabled) {
            console.log(`[notification] Channel ${channel.name} is disabled, skipping`);
            return;
        }

        const config = typeof channel.config === 'string'
            ? JSON.parse(channel.config)
            : channel.config;

        try {
            switch (channel.type) {
                case 'email':
                    await this.sendEmail(config, payload);
                    break;
                case 'slack':
                    await this.sendSlack(config, payload);
                    break;
                case 'webhook':
                    await this.sendWebhook(config, payload);
                    break;
                case 'discord':
                    await this.sendDiscord(config, payload);
                    break;
                default:
                    console.warn(`[notification] Unknown channel type: ${channel.type}`);
            }
            console.log(`[notification] Sent to ${channel.name} (${channel.type})`);
        } catch (err) {
            console.error(`[notification] Failed to send to ${channel.name}:`, err.message);
            throw err;
        }
    }

    /**
     * Send email notification (mock for now, requires SMTP config)
     */
    async sendEmail(config, payload) {
        console.log('[notification] Email notification (MOCK):');
        console.log('  To:', config.recipients);
        console.log('  Subject:', `[${payload.state.toUpperCase()}] ${payload.alertName}`);
        console.log('  Body:', payload.message);
        console.log('  Value:', payload.value, 'Threshold:', payload.threshold);

        // TODO: Implement actual email sending with nodemailer when SMTP is configured
        // const nodemailer = require('nodemailer');
        // const transporter = nodemailer.createTransport({ ... });
        // await transporter.sendMail({ ... });
    }

    /**
     * Send Slack notification via webhook
     */
    async sendSlack(config, payload) {
        const axios = require('axios');

        const color = payload.state === 'firing' ? 'danger' : 'good';
        const slackMessage = {
            attachments: [
                {
                    color: color,
                    title: `🚨 ${payload.alertName}`,
                    text: payload.message,
                    fields: [
                        {
                            title: 'State',
                            value: payload.state.toUpperCase(),
                            short: true
                        },
                        {
                            title: 'Value',
                            value: `${payload.value} (Threshold: ${payload.threshold})`,
                            short: true
                        },
                        {
                            title: 'Time',
                            value: payload.timestamp,
                            short: false
                        }
                    ],
                    footer: 'Gauge Monitoring',
                    ts: Math.floor(Date.now() / 1000)
                }
            ]
        };

        await axios.post(config.url, slackMessage);
    }

    /**
     * Send Discord notification via webhook
     */
    async sendDiscord(config, payload) {
        const axios = require('axios');

        const color = payload.state === 'firing' ? 15158332 : 3066993; // red : green
        const discordMessage = {
            embeds: [
                {
                    title: `🚨 ${payload.alertName}`,
                    description: payload.message,
                    color: color,
                    fields: [
                        {
                            name: 'State',
                            value: payload.state.toUpperCase(),
                            inline: true
                        },
                        {
                            name: 'Value',
                            value: `${payload.value}`,
                            inline: true
                        },
                        {
                            name: 'Threshold',
                            value: `${payload.threshold}`,
                            inline: true
                        }
                    ],
                    timestamp: payload.timestamp,
                    footer: {
                        text: 'Gauge Monitoring'
                    }
                }
            ]
        };

        await axios.post(config.url, discordMessage);
    }

    /**
     * Send generic webhook notification
     */
    async sendWebhook(config, payload) {
        const axios = require('axios');

        const webhookPayload = {
            alert: payload.alertName,
            message: payload.message,
            state: payload.state,
            value: payload.value,
            threshold: payload.threshold,
            timestamp: payload.timestamp
        };

        const options = {
            method: config.method || 'POST',
            url: config.url,
            headers: config.headers || { 'Content-Type': 'application/json' },
            data: webhookPayload,
            timeout: 10000 // 10 second timeout
        };

        try {
            const response = await axios(options);
            return response;
        } catch (err) {
            // Handle different HTTP error codes
            if (err.response) {
                const status = err.response.status;
                if (status === 429) {
                    throw new Error(`Webhook rate limit exceeded. Please wait before sending more requests or upgrade your webhook service.`);
                } else if (status === 404) {
                    throw new Error(`Webhook URL not found (404). Please check the webhook configuration.`);
                } else if (status >= 500) {
                    throw new Error(`Webhook server error (${status}). The webhook service may be down.`);
                } else if (status >= 400) {
                    throw new Error(`Webhook client error (${status}). Please check your webhook configuration.`);
                } else {
                    throw new Error(`Webhook request failed with status ${status}`);
                }
            } else if (err.request) {
                throw new Error(`Webhook request failed: No response from server. Please check the URL and network connection.`);
            } else {
                throw new Error(`Webhook request failed: ${err.message}`);
            }
        }
    }

    /**
     * Send notifications to multiple channels
     */
    async sendToChannels(channelIds, payload) {
        if (!channelIds || channelIds.length === 0) {
            console.log('[notification] No channels specified');
            return;
        }

        const results = await pool.query(
            'SELECT * FROM notification_channels WHERE id = ANY($1) AND is_enabled = TRUE',
            [channelIds]
        );

        const promises = results.rows.map(channel =>
            this.sendNotification(channel, payload).catch(err => {
                console.error(`[notification] Error sending to channel ${channel.id}:`, err);
            })
        );

        await Promise.allSettled(promises);
    }
}

module.exports = new NotificationService();
