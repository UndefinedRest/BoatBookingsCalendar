# Unified Deployment Solution - Executive Summary

## Problem Statement

Deploy both **Boat Booking Viewer** and **Club Noticeboard** on a single Raspberry Pi with:
- Shared configuration (URLs, branding, credentials)
- Easy switching between applications
- Inactive app remains idle (no RevSport calls)
- Simple deployment and maintenance

---

## Recommended Solution

**PM2-Managed Multi-App with Configuration Launcher**

### Architecture Overview

```
┌────────────────────────────────────────────────┐
│         Launcher App (Port 80)                  │
│  • Web-based switching control                 │
│  • Shared config management                    │
│  • Reverse proxy to active app                 │
│  • PM2 lifecycle management                    │
└────────────────────────────────────────────────┘
              ↓                    ↓
┌──────────────────────┐  ┌──────────────────────┐
│ Booking Viewer       │  │ Noticeboard          │
│ Port 3001            │  │ Port 3002            │
│ Active/Stopped       │  │ Active/Stopped       │
└──────────────────────┘  └──────────────────────┘
              ↓                    ↓
┌────────────────────────────────────────────────┐
│   Shared Config: /home/pi/lmrc-config/config.json  │
│   • Club details & branding                    │
│   • RevSport URL & credentials                 │
│   • App-specific settings                      │
└────────────────────────────────────────────────┘
```

---

## Key Features

### 1. **Shared Configuration File**
Single JSON file contains all common settings:
- RevSport base URL
- Club name, branding, colors, logo
- RevSport credentials
- Timezone, session times
- App-specific configuration

**Location**: `/home/pi/lmrc-config/config.json`

### 2. **Launcher Application**
Lightweight Express.js app that:
- Provides web-based switching UI
- Controls PM2 to start/stop apps
- Reverse proxies to active app
- Manages shared configuration
- Monitors app health

**Port 80** - Single entry point for kiosk

### 3. **Process Management**
PM2 handles three processes:
- `lmrc-launcher` (always running)
- `lmrc-booking-viewer` (controlled by launcher)
- `lmrc-noticeboard` (controlled by launcher)

Only the active app runs → **saves resources, prevents unnecessary RevSport calls**

### 4. **Easy Switching**
Two methods:
1. **Web UI**: Visual control panel at `http://localhost`
2. **API**: `POST /api/switch {"app": "noticeboard"}`

Switching process:
1. Stop current app (via PM2)
2. Update shared config
3. Start new app (via PM2)
4. Wait for health check
5. Redirect kiosk browser

---

## Configuration Structure

```json
{
  "activeApp": "booking-viewer",

  "club": {
    "name": "Lake Macquarie Rowing Club",
    "shortName": "LMRC",
    "timezone": "Australia/Sydney"
  },

  "branding": {
    "primaryColor": "#1e40af",
    "secondaryColor": "#0ea5e9",
    "logoPath": "/home/pi/lmrc-config/assets/lmrc-logo.png"
  },

  "revsport": {
    "baseUrl": "https://www.lakemacquarierowingclub.org.au",
    "credentials": {
      "username": "gevans11",
      "password": "Jk$Lv95EB@xU&7wq"
    }
  },

  "bookingViewer": {
    "port": 3001,
    "sessions": { ... }
  },

  "noticeboard": {
    "port": 3002,
    "scraper": { ... }
  }
}
```

---

## Application Modifications

### Booking Viewer
**Changes**:
- Read `LMRC_CONFIG` environment variable
- Load shared config if available
- Fall back to `.env` if shared config not found
- Use `port` from shared config

**Backward Compatible**: Still works standalone with `.env`

### Noticeboard
**Changes**:
- Read `LMRC_CONFIG` environment variable
- Merge shared config with local `config.json`
- Use `port` from shared config

**Backward Compatible**: Still works standalone with local config

---

## Benefits

### Resource Efficiency
- **Active app only**: Inactive app completely stopped
- **No wasted CPU**: No background polling when idle
- **No wasted network**: No RevSport calls from inactive app
- **Launcher overhead**: ~10MB RAM only

### Easy Management
- **Web-based control**: No SSH required for switching
- **Health monitoring**: See status of both apps
- **Centralized config**: Update once, affects both apps
- **PM2 auto-restart**: Apps restart on crash

### Clean Architecture
- **No coupling**: Apps remain independent
- **Shared only where needed**: Common config, separate app logic
- **Easy updates**: Update either app without affecting other
- **Maintainable**: Clear separation of concerns

### Operational Simplicity
- **Single entry point**: Kiosk always points to `localhost`
- **Graceful switching**: No manual process management
- **Reliable**: PM2 ensures apps stay running
- **Debuggable**: Centralized logs via PM2

---

## Deployment Process

### 1. Setup Shared Configuration
```bash
sudo mkdir -p /home/pi/lmrc-config/assets
cp config-template.json /home/pi/lmrc-config/config.json
cp lmrc-logo.png /home/pi/lmrc-config/assets/
```

### 2. Deploy Launcher
```bash
cd /home/pi
git clone <launcher-repo> lmrc-launcher
cd lmrc-launcher
npm install
```

### 3. Modify & Deploy Apps
```bash
# Update apps to use shared config
# Build and deploy both apps
```

### 4. Configure PM2
```bash
pm2 start /home/pi/lmrc-ecosystem.config.js
pm2 save
pm2 startup
```

### 5. Configure Kiosk
```bash
# Setup autostart for Chromium kiosk mode
# Points to http://localhost (launcher)
```

---

## Alternative Solutions Considered

| Solution | Pros | Cons | Verdict |
|----------|------|------|---------|
| **Nginx Reverse Proxy** | Industry standard | Both apps always running | ❌ Wastes resources |
| **Single Unified App** | Native config sharing | Major refactoring required | ❌ Too much work |
| **systemd Services** | Native Linux | No web switching, harder debugging | ❌ Less user-friendly |
| **Docker Containers** | Ultimate isolation | Heavy for Pi, complexity | ❌ Overkill |
| **Launcher + PM2** ✅ | Resource efficient, easy switching | Requires launcher development | ✅ **Best fit** |

---

## Implementation Effort

### Development Work
- **Launcher Application**: 8-12 hours
  - Express server + reverse proxy
  - PM2 controller wrapper
  - Web UI for switching
  - Health monitoring

- **App Modifications**: 4-6 hours
  - Shared config integration (both apps)
  - Port configuration
  - Testing

- **Documentation & Scripts**: 4-6 hours
  - Deployment guide
  - Setup scripts
  - Testing

**Total**: 16-24 hours

---

## Security Notes

1. **Credentials**: Shared config readable only by `pi` user
2. **Launcher Access**: Consider basic auth for control panel
3. **Network**: Raspberry Pi should be on trusted network
4. **File Permissions**: `chmod 600 /home/pi/lmrc-config/config.json`

---

## Example Usage

### Switching Apps via Web UI
1. Open `http://localhost` in browser
2. See control panel with both apps
3. Click "Switch to Noticeboard"
4. Wait 5-10 seconds
5. Noticeboard appears, Booking Viewer stopped

### Switching Apps via API
```bash
# From SSH or remote
curl -X POST http://raspberry-pi.local/api/switch \
  -H "Content-Type: application/json" \
  -d '{"app": "noticeboard"}'
```

### Monitoring
```bash
# Check status
pm2 status

# View logs
pm2 logs lmrc-launcher
pm2 logs lmrc-booking-viewer
pm2 logs lmrc-noticeboard

# Check active app
curl http://localhost/api/apps
```

---

## Next Steps

1. ✅ **Review this proposal** - Confirm approach meets requirements
2. 🔨 **Develop launcher** - Build launcher application
3. 🔧 **Modify apps** - Add shared config support
4. 🧪 **Test locally** - Validate on development machine
5. 📦 **Deploy to test Pi** - Install on test Raspberry Pi
6. 📋 **Document operations** - Create admin guide
7. 🚀 **Production deployment** - Roll out to production Pi

---

## Questions for Decision

1. **Launcher Development**: Should we build custom launcher or use existing solution?
2. **Authentication**: Should control panel have password protection?
3. **Scheduling**: Need time-based automatic switching? (e.g., booking viewer on race days)
4. **Monitoring**: Need alerting if apps crash? (email/SMS)
5. **Remote Access**: Need to switch apps remotely over internet?

---

## Full Documentation

Complete technical documentation with code examples and implementation details:
- **[DEPLOYMENT_UNIFIED.md](DEPLOYMENT_UNIFIED.md)** - Full 2000+ line architectural document

This summary provides the strategic overview. Refer to full document for technical implementation details.

---

**Recommendation**: Proceed with PM2-Managed Launcher approach. It's the optimal balance of simplicity, efficiency, and maintainability for your use case.
