require('dotenv').config();

const config = {
    API_URL: process.env.API_URL,
    API_KEY: process.env.API_KEY,
    POLL_INTERVAL: process.env.POLL_INTERVAL_MS || 5000,
    PORT: process.env.PORT || 3000,
    FIREBASE_SERVICE_ACCOUNT_JSON: process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
    DB_HOST: process.env.DB_HOST,
    DB_USER: process.env.DB_USER,
    DB_PASS: process.env.DB_PASS,
    DB_NAME: process.env.DB_NAME
};

// Basic validation
const required = ['API_URL', 'API_KEY'];
const missing = required.filter(key => !config[key]);

if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
}

module.exports = config;
