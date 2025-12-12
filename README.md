# Notification Service

This is a Node.js backend service that polls a CRM API for new messages and sends push notifications via Firebase Cloud Messaging (FCM).

## Features
-   Polls CRM API for new messages.
-   Enriches messages with Bot info.
-   Sends FCM notifications to registered devices.
-   Manages device tokens in Firestore.

## Setup

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Environment Configuration**
    Create a `.env` file in the root directory (see `.env.example` or ask admin for keys):
    ```env
    API_URL=https://crm.1set.biz/api/v1/crm/chaters
    API_KEY=your_api_key
    FIREBASE_KEY_PATH=./service-account.json
    POLL_INTERVAL_MS=5000
    PORT=3000
    ```

3.  **Firebase Setup**
    Place your `service-account.json` file in the root directory. This file contains your Firebase Admin SDK credentials.

    > **WARNING**: Never commit `.env` or `service-account.json` to version control!

## Running

```bash
node index.js
```

## Structure
-   `index.js`: Entry point. Sets up Express server and starts polling.
-   `src/config.js`: Environment variable management.
-   `src/services/firebase.js`: Firebase init, Firestore, and Messaging logic.
-   `src/services/crm.js`: Polling logic and CRM API interactions.
