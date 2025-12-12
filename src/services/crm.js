const axios = require('axios');
const config = require('../config');
const firebaseService = require('./firebase');

// State
let lastSeenMessageId = null;

async function getBotInfo(botId) {
    try {
        const response = await axios.get('https://crm.1set.biz/api/v1/crm/bots', {
            headers: { 'api-key': config.API_KEY }
        });
        const bots = response.data;
        if (Array.isArray(bots)) {
            const bot = bots.find(b => String(b.id) === String(botId));
            if (bot) {
                return { name: bot.name, token_id: bot.token_id };
            }
        }
        return null;
    } catch (error) {
        console.error('Bot Info Lookup Error:', error.message);
        return null;
    }
}

async function pollApi() {
    try {
        // console.log(`Polling API...`); // Reduce noise
        const response = await axios.get(config.API_URL, {
            headers: { 'api-key': config.API_KEY }
        });

        const messages = response.data;
        if (!Array.isArray(messages) || messages.length === 0) {
            return;
        }

        // Sort messages by ID desc to get latest
        const latestMessage = messages.reduce((prev, current) => {
            return (Number(prev.id) > Number(current.id)) ? prev : current;
        });

        if (lastSeenMessageId === null) {
            lastSeenMessageId = latestMessage.id;
            console.log(`Initialized. Last seen message ID: ${lastSeenMessageId}`);
            return;
        }

        if (Number(latestMessage.id) > Number(lastSeenMessageId)) {
            console.log(`New message detected! ID: ${latestMessage.id}`);
            console.log('DEBUG: Raw message data:', JSON.stringify(latestMessage, null, 2));
            lastSeenMessageId = latestMessage.id;

            // Enrich with bot info
            console.log(`DEBUG: Fetching bot info for Bot ID: ${latestMessage.bot_id}...`);
            const botInfo = await getBotInfo(latestMessage.bot_id);
            console.log('DEBUG: Bot Info result:', JSON.stringify(botInfo, null, 2));

            if (botInfo) {
                latestMessage.botName = botInfo.name;
                latestMessage.botToken = botInfo.token_id;
                console.log('DEBUG: Message successfully enriched with bot info');
            } else {
                console.warn('DEBUG: No bot info found, using defaults');
            }

            // Using the imported firebaseService to broadcast
            await firebaseService.broadcastNotification(latestMessage);
        }
    } catch (error) {
        console.error('Polling Error:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
        }
    }
}

function startPolling() {
    console.log('Starting Notification Poller...');
    pollApi(); // Run immediately on start
    setInterval(pollApi, config.POLL_INTERVAL);
}

module.exports = {
    startPolling,
    pollApi,
    getBotInfo
};
