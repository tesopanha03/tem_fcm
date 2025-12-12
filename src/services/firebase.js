const admin = require('firebase-admin');
const config = require('../config');
const path = require('path');

// Initialize Firebase
try {
    let serviceAccount;

    if (config.FIREBASE_SERVICE_ACCOUNT_JSON) {
        // Production: Load from Environment Variable
        try {
            serviceAccount = JSON.parse(config.FIREBASE_SERVICE_ACCOUNT_JSON);
            console.log('Firebase initialized using FIREBASE_SERVICE_ACCOUNT_JSON environment variable');
        } catch (e) {
            console.error('Error parsing FIREBASE_SERVICE_ACCOUNT_JSON:', e.message);
            throw e;
        }
    } else if (config.FIREBASE_KEY_PATH) {
        // Local/Dev: Load from File Path
        let serviceAccountPath = config.FIREBASE_KEY_PATH;
        if (!path.isAbsolute(serviceAccountPath)) {
            serviceAccountPath = path.resolve(process.cwd(), serviceAccountPath);
        }
        serviceAccount = require(serviceAccountPath);
        console.log('Firebase initialized using file:', serviceAccountPath);
    } else {
        throw new Error('No Firebase credentials found (Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_KEY_PATH)');
    }

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Error initializing Firebase:', error.message);
    process.exit(1);
}

const db = admin.firestore();
const messaging = admin.messaging();

async function getTokens() {
    try {
        const snapshot = await db.collection('user_tokens').get();
        if (snapshot.empty) {
            return [];
        }
        return snapshot.docs.map(doc => doc.data().fcm_token).filter(token => token);
    } catch (error) {
        console.error('Firestore Error (getTokens):', error.message);
        return [];
    }
}

async function removeInvalidToken(token) {
    try {
        const snapshot = await db.collection('user_tokens').where('fcm_token', '==', token).get();
        if (snapshot.empty) {
            return;
        }

        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(`Removed invalid token from Firestore: ${token}`);
    } catch (error) {
        console.error('Firestore Error (removeInvalidToken):', error.message);
    }
}

async function registerToken(userId, fcmToken, platform) {
    const snapshot = await db.collection('user_tokens')
        .where('fcm_token', '==', fcmToken)
        .limit(1)
        .get();

    if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        await doc.ref.update({
            user_id: userId,
            platform: platform || 'unknown',
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`[SUCCESS] Token updated for User ID: ${userId} ${fcmToken}`);
    } else {
        await db.collection('user_tokens').add({
            user_id: userId,
            fcm_token: fcmToken,
            platform: platform || 'unknown',
            created_at: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`[SUCCESS] New token registered for User ID: ${userId} ${fcmToken}`);
    }
}

async function broadcastNotification(message) {
    const tokens = await getTokens();
    if (tokens.length === 0) {
        console.log('No registered tokens found. Skipping notification.');
        return;
    }

    const uniqueTokens = [...new Set(tokens)];

    const payload = {
        notification: {
            title: `${message.botName || 'Bot'} - ${message.first_name} ${message.last_name}`,
            body: message.message ? message.message.substring(0, 120) : 'New Message'
        },
        data: {
            id: String(message.id),
            chatId: String(message.chat_id),
            botId: String(message.bot_id),
            name: `${message.first_name || ''} ${message.last_name || ''}`.trim(),
            username: message.username || '',
            botToken: message.botToken || ''
        }
    };

    console.log('FCM Payload:', JSON.stringify(payload, null, 2));
    console.log(`Sending notification to ${uniqueTokens.length} devices...`);

    const promises = uniqueTokens.map(token =>
        messaging.send({ token, ...payload })
            .then(() => ({ success: true, token }))
            .catch(err => ({ success: false, token, error: err }))
    );

    const results = await Promise.all(promises);

    results.forEach(result => {
        if (!result.success) {
            console.error(`Failed to send to ${result.token}:`, result.error.code);
            if (result.error.code === 'messaging/registration-token-not-registered' ||
                result.error.code === 'messaging/invalid-argument') {
                removeInvalidToken(result.token);
            }
        }
    });

    console.log('Notification broadcast complete.');
}

module.exports = {
    db,
    messaging,
    getTokens,
    removeInvalidToken,
    registerToken,
    broadcastNotification
};
