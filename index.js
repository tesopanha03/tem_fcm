const express = require('express');
const cors = require('cors');
const config = require('./src/config');
const firebaseService = require('./src/services/firebase');
const crmService = require('./src/services/crm');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// --- API Endpoints ---

app.post('/api/v1/notifications/register-token', async (req, res) => {
    try {
        const receivedApiKey = req.headers['api-key'];
        if (receivedApiKey !== config.API_KEY) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { user_id, fcm_token, platform } = req.body;

        if (!user_id || !fcm_token) {
            return res.status(400).json({ error: 'Missing user_id or fcm_token' });
        }

        console.log(`Registering token for User ID: ${user_id}`);

        await firebaseService.registerToken(user_id, fcm_token, platform);

        const responseData = { success: true, message: 'Token registered successfully' };
        console.log(`[RESULT] Returning response:`, JSON.stringify(responseData));
        res.status(200).json(responseData);

    } catch (error) {
        console.error('[FAILURE] API Error (register-token):', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Start Server and Polling
app.listen(config.PORT, () => {
    console.log(`Server running on port ${config.PORT}`);

    // Start polling service
    crmService.startPolling();
});

// Handle errors
process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED REJECTION:', reason);
});
