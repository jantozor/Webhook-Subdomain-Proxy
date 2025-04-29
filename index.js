require('dotenv').config();
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { v4: uuidv4 } = require('uuid');

const app = express();
const path = require('path');

const SECRET_KEY = process.env.SECRET_KEY;
const DOMAIN_NAME = process.env.DOMAIN_NAME;
const ListenPort = process.env.DEFAULT_LISTEN_PORT;

const subdomainToIP = {};

// To parse JSON in POST requests
app.use(express.json());
// Route to register a new webhook
app.post('/register', (req, res) => {
    const { ip, port, wantedSubdomain, secret, userKey } = req.body;
    console.log("Received data:", req.body);
    if (!secret || secret !== SECRET_KEY) {
        console.error(`Invalid or missing secret: ${secret}`);
        return res.status(403).json({ error: "Invalid or missing secret." });
    }
    if (!ip) {
        console.error("IP address is missing.");
        return res.status(400).json({ error: "IP address is required." });
    }

    const targetPort = port || process.env.DEFAULT_TARGET_PORT || 80;
    let subdomain;

    if (wantedSubdomain) {
        const regex = /^[a-z0-9]+$/; // Only allow a-z and 0-9
        if (!regex.test(wantedSubdomain)) {
            console.error(`Invalid subdomain format: ${wantedSubdomain}`);
            return res.status(400).json({ error: "Subdomain can only contain lowercase letters (a-z) and numbers (0-9)." });
        }
        const fullWantedSubdomain = `${wantedSubdomain}.${DOMAIN_NAME}`;
        const existing = subdomainToIP[fullWantedSubdomain];

        if (existing) {
            if (!userKey || userKey !== existing.userKey) {
                return res.status(409).json({ error: "Subdomain already in use. Provide correct userKey to update." });
            }
            // Update IP and port
            existing.ip = ip;
            existing.port = targetPort;
            console.log(`Updated ${fullWantedSubdomain} to ${ip}:${targetPort}`);
            return res.json({ webhookUrl: `https://${fullWantedSubdomain}/`, userKey: existing.userKey, updated: true  });
        }
        else{
            subdomain = wantedSubdomain;
        }
    } else {
        subdomain = uuidv4().slice(0, 6); // Generate random
    }
    const fullSubdomain = `${subdomain}.${DOMAIN_NAME}`;

    // Assign random userKey if not provided
    const finalUserKey = userKey || uuidv4().slice(0, 8);

    subdomainToIP[fullSubdomain] = { ip, port: targetPort, finalUserKey };
    console.log(`Mapped ${fullSubdomain} to ${ip}:${targetPort} with userKey ${finalUserKey}`);

    return res.json({ webhookUrl: `https://${fullSubdomain}/`, userKey: finalUserKey });
});
// Serve static homepage if host matches
app.use((req, res, next) => {
    const host = req.headers.host;
    if (host === DOMAIN_NAME) {
        console.log(`Serving static file for host ${host}`);
        express.static(path.join(__dirname, 'public'))(req, res, next);
    } else {
        next(); // passes control to next middleware
    }
});
// Proxy all other incoming requests
app.use((req, res, next) => {
    const host = req.headers.host;
    const entry = subdomainToIP[host];
    const ip = subdomainToIP[host];
    if (entry) {
        const { ip, port } = entry;
        const targetUrl = `http://${ip}:${port}`;
        console.log(`Proxying ${host} to ${targetUrl}`);
        createProxyMiddleware({
            target: targetUrl,
            changeOrigin: true,
            ws: true // Proxy websockets too
        })(req, res, next);
    } else {
        console.error(`Subdomain not registered: ${host}`);
        res.status(404).send('Subdomain not registered.');
    }
});

app.listen(ListenPort, () => {
    console.log(`Webhook proxy server running at http://localhost:${ListenPort}`);
});