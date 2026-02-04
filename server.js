const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'sky_store.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Sky Store is running' });
});

// Start server
app.listen(PORT, () => {
    console.log(`
    ╔════════════════════════════════════════╗
    ║     🌟 Sky Store Server Started 🌟    ║
    ╚════════════════════════════════════════╝
    
    📍 Server is running on: http://localhost:${PORT}
    
    To access the store:
    → Open your browser and go to: http://localhost:${PORT}
    
    To stop the server:
    → Press Ctrl + C
    
    ════════════════════════════════════════
    `);
});

// Error handling
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
