# Webhook Subdomain Proxy

This is a Node.js app that dynamically assigns subdomains to users for webhook forwarding.

Users can:
- Request a specific subdomain (if available).
- Get a random subdomain if their requested one is taken.
- Protect their request with a secret key.

## Features

- Subdomain creation on request.
- Random subdomain assignment fallback.
- Secret-protected registration.
- Subdomain name validation (only lowercase letters and numbers).
- Proxy incoming webhook traffic to the user's IP address.

## Requirements

- Node.js 18+
- A Plesk server (or any server) where you can point wildcard DNS (`*.yourdomain.com`).

## Installation

### 1. Clone the repository

First, clone the repository to your local machine:

```bash
    git clone https://github.com/<jantozor>/<webhook-proxy-tunnel>.git
    cd <webhook-proxy-tunnel>
```
### 2. Install dependencies
Install the necessary packages:
```bash
npm install
```
### 3. Set up environment variables
Create a `.env` file in the root of the project and add your secret key and domain name:
```bash
SECRET_KEY=your_secret_key
DOMAIN_NAME=yourdomain.com
```
Make sure to replace `your_secret_key` with a strong secret and `yourdomain.com` with your actual domain.
### 4. Start the server
```bash
node index.js
```
The server will now be running locally, and you can test the API by sending requests to `http://localhost:3000/register`.
## API
### `POST /register`
Register a new subdomain.

Body JSON:
```json
{
  "ip": "your_public_ip",
  "wantedSubdomain": "optional_subdomain_name",
  "secret": "your_secret_key"
}
```
Response:
```json
{
  "webhookUrl": "http://subdomain.yourdomain.com/"
}
```