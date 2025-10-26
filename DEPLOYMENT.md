# Deployment Guide

Complete deployment instructions for LMRC Booking Viewer.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Build & Prepare](#build--prepare)
3. [Deployment Options](#deployment-options)
   - [Option 1: PM2 (Recommended)](#option-1-pm2-recommended)
   - [Option 2: Systemd Service](#option-2-systemd-service)
   - [Option 3: Docker](#option-3-docker)
   - [Option 4: Docker Compose](#option-4-docker-compose)
   - [Option 5: Nginx Reverse Proxy](#option-5-nginx-reverse-proxy)
4. [Environment Configuration](#environment-configuration)
5. [SSL/HTTPS Setup](#ssl-https-setup)
6. [Monitoring & Logging](#monitoring--logging)
7. [Backup & Recovery](#backup--recovery)
8. [Security Best Practices](#security-best-practices)

---

## Prerequisites

### System Requirements

- **OS:** Linux (Ubuntu 20.04+ recommended), macOS, or Windows Server
- **Node.js:** v20.x or higher
- **RAM:** Minimum 512MB, recommended 1GB+
- **Disk:** Minimum 500MB for application + logs
- **Network:** Outbound HTTPS access to RevSport API

### Required Software

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y curl git build-essential

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should be v20.x
npm --version
```

---

## Build & Prepare

### 1. Clone Repository

```bash
cd /opt
sudo git clone https://github.com/UndefinedRest/BoatBookingsCalendar.git lmrc-booking-viewer
cd lmrc-booking-viewer
sudo chown -R $USER:$USER .
```

### 2. Install Dependencies

```bash
npm ci --only=production
```

### 3. Configure Environment

```bash
cp .env.example .env
nano .env  # Edit with your credentials
```

**Required configuration:**
```env
REVSPORT_BASE_URL=https://www.lakemacquarierowingclub.org.au
REVSPORT_USERNAME=your_username
REVSPORT_PASSWORD=your_password
PORT=3000
NODE_ENV=production
```

### 4. Build Application

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

### 5. Test Build

```bash
# Test the built application
NODE_ENV=production node dist/server/index.js

# Should see:
# [Server] ✓ Lake Macquarie Rowing Club - Booking Viewer
# [Server] Server: http://0.0.0.0:3000
# [Server] ✓ Server started successfully
```

Press Ctrl+C to stop.

---

## Deployment Options

### Option 1: PM2 (Recommended)

PM2 is a production process manager for Node.js with built-in load balancer, auto-restart, and monitoring.

#### Install PM2

```bash
sudo npm install -g pm2
```

#### Start Application

```bash
# Start the application
pm2 start dist/server/index.js --name lmrc-booking-viewer

# Save PM2 process list
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions printed by the command
```

#### PM2 Commands

```bash
# View status
pm2 status

# View logs
pm2 logs lmrc-booking-viewer

# Restart
pm2 restart lmrc-booking-viewer

# Stop
pm2 stop lmrc-booking-viewer

# Delete
pm2 delete lmrc-booking-viewer

# Monitor in real-time
pm2 monit
```

#### PM2 Configuration File (Optional)

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'lmrc-booking-viewer',
    script: './dist/server/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};
```

Then start with:
```bash
pm2 start ecosystem.config.js
```

---

### Option 2: Systemd Service

For systems that use systemd (most modern Linux distributions).

#### Create Service File

Create `/etc/systemd/system/lmrc-booking-viewer.service`:

```ini
[Unit]
Description=LMRC Booking Viewer
Documentation=https://github.com/UndefinedRest/BoatBookingsCalendar
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/lmrc-booking-viewer
Environment=NODE_ENV=production
EnvironmentFile=/opt/lmrc-booking-viewer/.env
ExecStart=/usr/bin/node dist/server/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=lmrc-booking-viewer

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/lmrc-booking-viewer

[Install]
WantedBy=multi-user.target
```

#### Enable and Start Service

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable lmrc-booking-viewer

# Start service
sudo systemctl start lmrc-booking-viewer

# Check status
sudo systemctl status lmrc-booking-viewer

# View logs
sudo journalctl -u lmrc-booking-viewer -f
```

#### Systemd Commands

```bash
# Start
sudo systemctl start lmrc-booking-viewer

# Stop
sudo systemctl stop lmrc-booking-viewer

# Restart
sudo systemctl restart lmrc-booking-viewer

# View logs
sudo journalctl -u lmrc-booking-viewer --since today

# Follow logs
sudo journalctl -u lmrc-booking-viewer -f
```

---

### Option 3: Docker

Containerize the application for consistent deployments.

#### Create Dockerfile

Already provided in the repository. If not, create `Dockerfile`:

```dockerfile
FROM node:20-alpine

# Create app directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application files
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3000/api/v1/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start application
CMD ["node", "dist/server/index.js"]
```

#### Build Image

```bash
docker build -t lmrc-booking-viewer:latest .
```

#### Run Container

```bash
docker run -d \
  --name lmrc-booking-viewer \
  -p 3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  lmrc-booking-viewer:latest
```

#### Docker Commands

```bash
# View logs
docker logs -f lmrc-booking-viewer

# Stop container
docker stop lmrc-booking-viewer

# Start container
docker start lmrc-booking-viewer

# Restart container
docker restart lmrc-booking-viewer

# Remove container
docker rm -f lmrc-booking-viewer

# Execute shell in container
docker exec -it lmrc-booking-viewer sh
```

---

### Option 4: Docker Compose

For easier management and environment configuration.

#### Create docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    container_name: lmrc-booking-viewer
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    volumes:
      - ./logs:/app/logs
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/api/v1/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 40s
```

#### Docker Compose Commands

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Restart services
docker-compose restart

# Rebuild and restart
docker-compose up -d --build
```

---

### Option 5: Nginx Reverse Proxy

Put the application behind Nginx for SSL termination, load balancing, and caching.

#### Install Nginx

```bash
sudo apt install -y nginx
```

#### Create Nginx Configuration

Create `/etc/nginx/sites-available/lmrc-booking-viewer`:

```nginx
# Upstream application server
upstream lmrc_app {
    server 127.0.0.1:3000;
    keepalive 64;
}

# HTTP server (redirect to HTTPS)
server {
    listen 80;
    listen [::]:80;
    server_name bookings.lakemacquarierowingclub.org.au;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name bookings.lakemacquarierowingclub.org.au;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/bookings.lakemacquarierowingclub.org.au/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bookings.lakemacquarierowingclub.org.au/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/lmrc-booking-viewer-access.log;
    error_log /var/log/nginx/lmrc-booking-viewer-error.log;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;

    # Proxy settings
    location / {
        proxy_pass http://lmrc_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static file caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://lmrc_app;
        proxy_cache_valid 200 1d;
        add_header Cache-Control "public, immutable";
    }

    # Health check endpoint
    location /api/v1/health {
        proxy_pass http://lmrc_app;
        access_log off;
    }
}
```

#### Enable Site

```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/lmrc-booking-viewer /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## Environment Configuration

### Production Environment Variables

```env
# Application
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# RevSport Credentials (REQUIRED)
REVSPORT_BASE_URL=https://www.lakemacquarierowingclub.org.au
REVSPORT_USERNAME=your_username
REVSPORT_PASSWORD=your_password
REVSPORT_DEBUG=false

# Club Configuration
CLUB_NAME=Lake Macquarie Rowing Club
CLUB_SHORT_NAME=LMRC
CLUB_TIMEZONE=Australia/Sydney
CLUB_PRIMARY_COLOR=#1e40af
CLUB_SECONDARY_COLOR=#0ea5e9

# Session Times (update seasonally)
SESSION_1_START=06:30
SESSION_1_END=07:30
SESSION_2_START=07:30
SESSION_2_END=08:30

# Cache Configuration
CACHE_TTL=600000          # 10 minutes
REFRESH_INTERVAL=600000   # 10 minutes
```

### Secure Credentials

```bash
# Set restrictive permissions on .env
chmod 600 .env

# Never commit .env to version control
echo ".env" >> .gitignore
```

---

## SSL/HTTPS Setup

### Using Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d bookings.lakemacquarierowingclub.org.au

# Auto-renewal (runs twice daily)
sudo certbot renew --dry-run
```

### Manual SSL Certificate

If using a purchased certificate:

```bash
# Copy certificates
sudo cp your-certificate.crt /etc/ssl/certs/lmrc-booking-viewer.crt
sudo cp your-private-key.key /etc/ssl/private/lmrc-booking-viewer.key

# Set permissions
sudo chmod 644 /etc/ssl/certs/lmrc-booking-viewer.crt
sudo chmod 600 /etc/ssl/private/lmrc-booking-viewer.key

# Update Nginx configuration with certificate paths
```

---

## Monitoring & Logging

### PM2 Monitoring

```bash
# Real-time monitoring
pm2 monit

# Web dashboard
pm2 install pm2-server-monit
```

### Log Rotation

Create `/etc/logrotate.d/lmrc-booking-viewer`:

```
/opt/lmrc-booking-viewer/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

### Application Monitoring

Consider using:
- **Uptime monitoring:** UptimeRobot, Pingdom
- **Application monitoring:** New Relic, Datadog
- **Log aggregation:** Papertrail, Loggly

---

## Backup & Recovery

### Backup Script

Create `backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/lmrc-booking-viewer"
APP_DIR="/opt/lmrc-booking-viewer"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# Backup .env file
cp "$APP_DIR/.env" "$BACKUP_DIR/.env.$DATE"

# Backup logs
tar -czf "$BACKUP_DIR/logs.$DATE.tar.gz" "$APP_DIR/logs"

# Keep only last 30 days
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete
find "$BACKUP_DIR" -name ".env.*" -mtime +30 -delete
```

```bash
chmod +x backup.sh

# Add to crontab (daily at 2 AM)
0 2 * * * /opt/lmrc-booking-viewer/backup.sh
```

---

## Security Best Practices

### 1. Firewall Configuration

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

### 2. Fail2Ban (Protect against brute force)

```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 3. Regular Updates

```bash
# System updates
sudo apt update && sudo apt upgrade -y

# Application updates
cd /opt/lmrc-booking-viewer
git pull
npm ci --only=production
npm run build
pm2 restart lmrc-booking-viewer
```

### 4. Monitoring

```bash
# Check application health
curl http://localhost:3000/api/v1/health

# Expected response:
# {"success":true,"data":{"status":"ok",...}}
```

---

## Troubleshooting

### Application Won't Start

```bash
# Check logs
pm2 logs lmrc-booking-viewer
# or
sudo journalctl -u lmrc-booking-viewer -f

# Common issues:
# - Port already in use
# - Missing .env file
# - Invalid credentials
# - Missing dependencies
```

### High Memory Usage

```bash
# Restart application
pm2 restart lmrc-booking-viewer

# Adjust memory limits in PM2
pm2 start dist/server/index.js --name lmrc-booking-viewer --max-memory-restart 500M
```

### Nginx 502 Bad Gateway

```bash
# Check if application is running
pm2 status

# Check application logs
pm2 logs lmrc-booking-viewer

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

---

## Support

For deployment issues:
1. Check logs: `pm2 logs` or `sudo journalctl -u lmrc-booking-viewer`
2. Verify `.env` configuration
3. Test health endpoint: `curl http://localhost:3000/api/v1/health`
4. Check GitHub Issues: https://github.com/UndefinedRest/BoatBookingsCalendar/issues

---

**Last Updated:** October 2025
