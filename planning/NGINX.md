# NGINX Reverse Proxy Configuration

This document describes how to configure NGINX to serve Astra Rising in production.

## Overview

- Node/Express runs on `localhost:3000` (or whatever `PORT` is set to in `.env`)
- NGINX terminates TLS and proxies all requests to the Node server
- Static files (`public/`) are served by Express; NGINX adds caching headers

## Minimal NGINX server block

```nginx
server {
    listen 80;
    server_name star.shawndata.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name star.shawndata.com;

    ssl_certificate     /etc/letsencrypt/live/star.shawndata.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/star.shawndata.com/privkey.pem;

    # Proxy all traffic to Node
    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}
```

## Process management (systemd)

Create `/etc/systemd/system/astra-rising.service`:

```ini
[Unit]
Description=Astra Rising AI DM
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/astra-rising
EnvironmentFile=/var/www/astra-rising/.env
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable astra-rising
sudo systemctl start astra-rising
```

## Deployment steps

```bash
# 1. Install dependencies
npm install --omit=dev

# 2. Copy and fill environment file
cp .env.example .env
# edit .env — set ANTHROPIC_API_KEY and DB_PATH

# 3. Start the server (or use systemd above)
npm start
```
