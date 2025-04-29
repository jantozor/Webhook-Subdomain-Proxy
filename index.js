require('dotenv').config();
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = 3000;
const path = require('path');

const SECRET_KEY = process.env.SECRET_KEY;
const DOMAIN_NAME = process.env.DOMAIN_NAME;

const subdomainToIP = {};

// To parse JSON in POST requests
app.use(express.json());
// Route to register a new webhook
app.post('/register', (req, res) => {
    const { ip, wantedSubdomain } = req.body;
    if (!secret || secret !== SECRET_KEY) {
        return res.status(403).json({ error: "Invalid or missing secret." });
    }
    if (!ip) {
        return res.status(400).json({ error: "IP address is required." });
    }

    let subdomain;

    if (wantedSubdomain) {
        const regex = /^[a-z0-9]+$/; // Only allow a-z and 0-9
        if (!regex.test(wantedSubdomain)) {
            return res.status(400).json({ error: "Subdomain can only contain lowercase letters (a-z) and numbers (0-9)." });
        }
        const fullWantedSubdomain = `${wantedSubdomain}.${DOMAIN_NAME}`;
        if (!subdomainToIP[fullWantedSubdomain]) {
            // Wanted subdomain is available
            subdomain = wantedSubdomain;
        } else {
            // Already taken
            console.log(`Subdomain ${wantedSubdomain} is taken, generating random.`);
            subdomain = uuidv4().slice(0, 6); // Generate random
        }
    } else {
        subdomain = uuidv4().slice(0, 6); // Generate random
    }
    const fullSubdomain = `${subdomain}.${DOMAIN_NAME}`;

    subdomainToIP[fullSubdomain] = ip;

    console.log(`Mapped ${fullSubdomain} to ${ip}`);

    res.json({ webhookUrl: `https://${fullSubdomain}/` });
});
// Serve static homepage if host matches
app.use((req, res, next) => {
    const host = req.headers.host;
    if (host === DOMAIN_NAME) {
        express.static(path.join(__dirname, 'public'))(req, res, next);
    } else {
        next(); // passes control to next middleware
    }
});
// app.post('/register', (req, res) => {
//     const { ip } = req.body;
//     if (!ip) {
//         return res.status(400).json({ error: "IP address is required." });
//     }

//     const subdomain = uuidv4().slice(0, 6); // Short random subdomain
//     const fullSubdomain = `${subdomain}.zolverz.com`; // <-- Replace with your domain

//     subdomainToIP[fullSubdomain] = ip;

//     console.log(`Mapped ${fullSubdomain} to ${ip}`);

//     res.json({ webhookUrl: `http://${fullSubdomain}/` });
// });

// Proxy all other incoming requests
app.use((req, res, next) => {
    const host = req.headers.host;
    const ip = subdomainToIP[host];
    if (ip) {
        console.log(`Proxying ${host} to ${ip}`);
        createProxyMiddleware({
            target: `http://${ip}`,
            changeOrigin: true,
            ws: true // Proxy websockets too
        })(req, res, next);
    } else {
        res.status(404).send('Subdomain not registered.');
    }
});

app.listen(port, () => {
    console.log(`Webhook proxy server running at http://localhost:${port}`);
});