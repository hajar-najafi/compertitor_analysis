require('dotenv').config();
const path = require('path');

const config = {
    // Application
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT) || 3000,

    // Database
    database: {
        url: process.env.DATABASE_URL || 'sqlite://./data/competitors.db'
    },

    // Email
    email: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
        from: process.env.EMAIL_FROM,
        to: process.env.EMAIL_TO
    },

    // API Keys
    apis: {
        socialMedia: process.env.SOCIAL_MEDIA_API_KEY,
        seo: process.env.SEO_API_KEY,
        priceMonitoring: process.env.PRICE_MONITORING_API_KEY
    },

    // File Paths
    paths: {
        competitors: process.env.COMPETITORS_FILE || './data/competitors.json',
        reports: process.env.REPORTS_DIR || './data/reports',
        logs: process.env.LOGS_DIR || './logs'
    },

    // Scheduling
    schedule: {
        analysis: process.env.ANALYSIS_SCHEDULE || '0 9 * * 3', // Every Wednesday at 9 AM
        timezone: process.env.TIMEZONE || 'Europe/Rome'
    },

    // Monitoring Intervals (in milliseconds)
    intervals: {
        website: parseInt(process.env.WEBSITE_CHECK_INTERVAL) || 300000, // 5 minutes
        socialMedia: parseInt(process.env.SOCIAL_MEDIA_CHECK_INTERVAL) || 600000, // 10 minutes
        price: parseInt(process.env.PRICE_CHECK_INTERVAL) || 3600000 // 1 hour
    },

    // Reports
    reports: {
        template: process.env.REPORT_TEMPLATE || 'weekly',
        format: process.env.REPORT_FORMAT || 'html',
        emailEnabled: process.env.ENABLE_EMAIL_REPORTS === 'true',
        slackEnabled: process.env.ENABLE_SLACK_REPORTS === 'true'
    },

    // Slack
    slack: {
        webhookUrl: process.env.SLACK_WEBHOOK_URL,
        channel: process.env.SLACK_CHANNEL || '#competitors-analysis'
    }
};

// Validate required configuration
const validateConfig = () => {
    const required = [
        'email.user',
        'email.pass',
        'email.from',
        'email.to'
    ];

    const missing = required.filter(key => {
        const value = key.split('.').reduce((obj, k) => obj?.[k], config);
        return !value;
    });

    if (missing.length > 0) {
        console.warn('⚠️  Missing required configuration:', missing.join(', '));
        console.warn('Please check your .env file');
    }

    return missing.length === 0;
};

// Create directories if they don't exist
const ensureDirectories = () => {
    const fs = require('fs');
    const dirs = [
        config.paths.reports,
        config.paths.logs,
        path.dirname(config.paths.competitors)
    ];

    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
};

module.exports = {
    config,
    validateConfig,
    ensureDirectories
}; 