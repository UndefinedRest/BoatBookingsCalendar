# Unified Deployment Solution: LMRC Boatshed Display System

## Executive Summary

This document proposes a unified deployment architecture for running both the **Boat Booking Viewer** and **Club Noticeboard** applications on a single Raspberry Pi, with easy switching between displays and shared configuration.

**Solution**: **PM2-Managed Multi-App with Configuration Launcher**

---

## Current State Analysis

### Application Comparison

| Aspect | Boat Booking Viewer | Club Noticeboard |
|--------|-------------------|------------------|
| **Port** | 3000 | 3000 |
| **Stack** | Express + TypeScript + React | Express + Node.js + React |
| **RevSport** | Authenticated API calls | Public page scraping |
| **Credentials** | Required (username/password) | Not required |
| **Data Refresh** | Real-time (10 min cache) | Scheduled (4 hour scraping) |
| **Resource Usage** | ~150MB RAM | ~50MB RAM |
| **RevSport Load** | High (continuous polling) | Low (scheduled scraping) |
| **Build Tool** | TypeScript/Vite | Vite |

### Common Configuration Needs

**Identified Shared Configuration:**
1. RevSport base URL
2. Club branding (name, tagline, colors, logo)
3. RevSport credentials (booking viewer only)
4. Timezone
5. Session times (booking viewer only)
6. Weather location (noticeboard only)

---

## Recommended Solution Architecture

### Overview: PM2-Managed Dual-App with Launcher

```
┌─────────────────────────────────────────────────────────────┐
│                    Raspberry Pi System                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │     Launcher App (Port 80)                            │  │
│  │  - Configuration UI                                   │  │
│  │  - App switching controls                             │  │
│  │  - Shared config management                           │  │
│  │  - PM2 control wrapper                                │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↕                                   │
│  ┌────────────────────┐        ┌─────────────────────────┐ │
│  │ Booking Viewer     │        │ Noticeboard             │ │
│  │ (Port 3001)        │  ←→    │ (Port 3002)             │ │
│  │ - Active/Stopped   │        │ - Active/Stopped        │ │
│  │ - RevSport Auth    │        │ - Public Scraping       │ │
│  └────────────────────┘        └─────────────────────────┘ │
│                          ↕                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │     Shared Configuration File                         │  │
│  │     /home/pi/lmrc-config/config.json                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │     PM2 Process Manager                               │  │
│  │  - lmrc-launcher (always running)                     │  │
│  │  - lmrc-booking-viewer (controlled)                   │  │
│  │  - lmrc-noticeboard (controlled)                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │     Chromium Kiosk Mode                               │  │
│  │     http://localhost (→ launcher routes to active)    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Solution Design

### 1. Shared Configuration Structure

**File Location**: `/home/pi/lmrc-config/config.json`

```json
{
  "version": "1.0.0",
  "activeApp": "booking-viewer",

  "club": {
    "name": "Lake Macquarie Rowing Club",
    "shortName": "LMRC",
    "tagline": "Excellence on the Water",
    "timezone": "Australia/Sydney",
    "location": {
      "latitude": -33.0544,
      "longitude": 151.5986,
      "displayName": "Lake Macquarie, NSW"
    }
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
    },
    "scraping": {
      "timeout": 30000,
      "retries": 3
    }
  },

  "bookingViewer": {
    "port": 3001,
    "sessions": {
      "morning1": { "start": "06:30", "end": "07:30" },
      "morning2": { "start": "07:30", "end": "08:30" }
    },
    "cache": {
      "ttl": 600,
      "refreshInterval": 600
    }
  },

  "noticeboard": {
    "port": 3002,
    "scraper": {
      "schedule": "0 */4 * * *",
      "runOnStartup": true
    },
    "display": {
      "rotationInterval": 10,
      "newsUpdateInterval": 60
    }
  },

  "launcher": {
    "port": 80,
    "switchingDelay": 3000
  }
}
```

---

### 2. Launcher Application Design

**Purpose**:
- Single entry point for all apps
- Manage app lifecycle (start/stop via PM2)
- Provide switching UI
- Serve shared configuration
- Reverse proxy to active app

**Technology**: Express.js + Simple HTML/JS UI

**Key Features**:
1. **Routing**: Reverse proxy to active app
2. **Control Panel**: Web UI to switch between apps
3. **Health Monitoring**: Check status of both apps
4. **Graceful Switching**:
   - Display loading screen
   - Stop inactive app
   - Start new app
   - Wait for health check
   - Redirect to new app

**File Structure**:
```
/home/pi/lmrc-launcher/
├── server.js                 # Main launcher server
├── package.json
├── public/
│   ├── index.html           # Launcher control panel
│   ├── loading.html         # Switching screen
│   └── style.css
├── lib/
│   ├── pm2-controller.js    # PM2 wrapper
│   ├── config-manager.js    # Shared config loader
│   └── proxy.js             # Reverse proxy logic
└── config/
    └── apps.json            # App definitions
```

**App Definitions** (`apps.json`):
```json
{
  "apps": {
    "booking-viewer": {
      "name": "lmrc-booking-viewer",
      "displayName": "Boat Booking Viewer",
      "port": 3001,
      "healthCheck": "/api/v1/bookings",
      "script": "/home/pi/lmrc-booking-system/dist/server/index.js",
      "cwd": "/home/pi/lmrc-booking-system",
      "env": {
        "NODE_ENV": "production",
        "LMRC_CONFIG": "/home/pi/lmrc-config/config.json"
      }
    },
    "noticeboard": {
      "name": "lmrc-noticeboard",
      "displayName": "Club Noticeboard",
      "port": 3002,
      "healthCheck": "/api/health",
      "script": "/home/pi/Noticeboard/server.js",
      "cwd": "/home/pi/Noticeboard",
      "env": {
        "NODE_ENV": "production",
        "PORT": "3002",
        "LMRC_CONFIG": "/home/pi/lmrc-config/config.json"
      }
    }
  }
}
```

---

### 3. Application Modifications

#### A. Booking Viewer Changes

**File**: `src/config/server.ts`

```typescript
import fs from 'fs';
import path from 'path';

// Check for shared config
const sharedConfigPath = process.env.LMRC_CONFIG || '/home/pi/lmrc-config/config.json';

let sharedConfig: any = null;
if (fs.existsSync(sharedConfigPath)) {
  sharedConfig = JSON.parse(fs.readFileSync(sharedConfigPath, 'utf-8'));
}

export function getServerConfig() {
  // Use shared config if available, fall back to env vars
  return {
    port: sharedConfig?.bookingViewer?.port || parseInt(process.env.PORT || '3001'),
    host: '0.0.0.0',
    env: process.env.NODE_ENV || 'development',
    cacheTTL: (sharedConfig?.bookingViewer?.cache?.ttl || 600) * 1000,
    refreshInterval: (sharedConfig?.bookingViewer?.cache?.refreshInterval || 600) * 1000,
  };
}

export function getAuthConfig() {
  if (sharedConfig) {
    return {
      baseUrl: sharedConfig.revsport.baseUrl,
      username: sharedConfig.revsport.credentials.username,
      password: sharedConfig.revsport.credentials.password,
    };
  }

  // Fall back to .env
  return {
    baseUrl: process.env.REVSPORT_BASE_URL,
    username: process.env.REVSPORT_USERNAME,
    password: process.env.REVSPORT_PASSWORD,
  };
}
```

#### B. Noticeboard Changes

**File**: `server.js`

Add at top of file:
```javascript
import fs from 'fs';

// Load shared config if available
const sharedConfigPath = process.env.LMRC_CONFIG || '/home/pi/lmrc-config/config.json';
let sharedConfig = null;

if (fs.existsSync(sharedConfigPath)) {
  try {
    sharedConfig = JSON.parse(fs.readFileSync(sharedConfigPath, 'utf-8'));
    console.log('✓ Loaded shared LMRC configuration');

    // Merge shared config into local config
    if (sharedConfig.noticeboard) {
      config.port = sharedConfig.noticeboard.port;
    }
    if (sharedConfig.revsport) {
      config.scraper.baseUrl = sharedConfig.revsport.baseUrl;
      config.scraper.timeout = sharedConfig.revsport.scraping.timeout;
      config.scraper.retries = sharedConfig.revsport.scraping.retries;
    }
    if (sharedConfig.branding) {
      config.branding = { ...config.branding, ...sharedConfig.branding };
    }
  } catch (error) {
    console.warn('⚠ Failed to load shared config, using local config');
  }
}
```

---

### 4. PM2 Ecosystem Configuration

**File**: `/home/pi/lmrc-ecosystem.config.js`

```javascript
module.exports = {
  apps: [
    {
      name: 'lmrc-launcher',
      script: '/home/pi/lmrc-launcher/server.js',
      cwd: '/home/pi/lmrc-launcher',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production',
        PORT: 80
      },
      error_file: '/home/pi/logs/launcher-error.log',
      out_file: '/home/pi/logs/launcher-out.log'
    },
    {
      name: 'lmrc-booking-viewer',
      script: '/home/pi/lmrc-booking-system/dist/server/index.js',
      cwd: '/home/pi/lmrc-booking-system',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        LMRC_CONFIG: '/home/pi/lmrc-config/config.json'
      },
      error_file: '/home/pi/logs/booking-viewer-error.log',
      out_file: '/home/pi/logs/booking-viewer-out.log'
    },
    {
      name: 'lmrc-noticeboard',
      script: '/home/pi/Noticeboard/server.js',
      cwd: '/home/pi/Noticeboard',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
        LMRC_CONFIG: '/home/pi/lmrc-config/config.json'
      },
      error_file: '/home/pi/logs/noticeboard-error.log',
      out_file: '/home/pi/logs/noticeboard-out.log'
    }
  ]
};
```

---

### 5. Switching Mechanism

**Launcher API Endpoints**:

```javascript
// GET /api/apps - List all apps and their status
{
  "activeApp": "booking-viewer",
  "apps": {
    "booking-viewer": {
      "status": "online",
      "uptime": 3600,
      "memory": 150
    },
    "noticeboard": {
      "status": "stopped",
      "uptime": 0,
      "memory": 0
    }
  }
}

// POST /api/switch
// Body: { "app": "noticeboard" }
// Returns: { "success": true, "newApp": "noticeboard" }

// Switching Process:
// 1. Update config.json (set activeApp)
// 2. Show loading screen to kiosk
// 3. pm2 stop <old-app>
// 4. pm2 start <new-app>
// 5. Wait for health check (max 30 seconds)
// 6. Update reverse proxy routing
// 7. Reload kiosk browser to new app
```

**Control Panel UI** (`public/index.html`):
```html
<!DOCTYPE html>
<html>
<head>
  <title>LMRC Display Control</title>
  <style>
    body { font-family: Arial; padding: 20px; }
    .app-card {
      border: 2px solid #ccc;
      padding: 20px;
      margin: 10px;
      border-radius: 8px;
    }
    .app-card.active { border-color: #1e40af; background: #eff6ff; }
    .status-indicator {
      display: inline-block;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      margin-right: 8px;
    }
    .status-online { background: #10b981; }
    .status-stopped { background: #ef4444; }
    button { padding: 10px 20px; font-size: 16px; cursor: pointer; }
  </style>
</head>
<body>
  <h1>LMRC Display Control Panel</h1>

  <div id="apps"></div>

  <script>
    async function loadApps() {
      const response = await fetch('/api/apps');
      const data = await response.json();

      const appsDiv = document.getElementById('apps');
      appsDiv.innerHTML = '';

      for (const [appId, appInfo] of Object.entries(data.apps)) {
        const isActive = appId === data.activeApp;
        const statusClass = appInfo.status === 'online' ? 'status-online' : 'status-stopped';

        appsDiv.innerHTML += `
          <div class="app-card ${isActive ? 'active' : ''}">
            <h2>
              <span class="status-indicator ${statusClass}"></span>
              ${appInfo.displayName}
            </h2>
            <p>Status: ${appInfo.status}</p>
            <p>Memory: ${appInfo.memory}MB</p>
            ${!isActive ? `<button onclick="switchApp('${appId}')">Switch to This App</button>` : '<p><strong>Currently Active</strong></p>'}
          </div>
        `;
      }
    }

    async function switchApp(appId) {
      if (!confirm(`Switch to ${appId}?`)) return;

      const response = await fetch('/api/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app: appId })
      });

      if (response.ok) {
        alert('Switching... Page will reload in 5 seconds');
        setTimeout(() => location.reload(), 5000);
      } else {
        alert('Failed to switch app');
      }
    }

    loadApps();
    setInterval(loadApps, 5000);
  </script>
</body>
</html>
```

---

### 6. Chromium Kiosk Configuration

**File**: `~/.config/autostart/lmrc-kiosk.desktop`

```ini
[Desktop Entry]
Type=Application
Name=LMRC Display Kiosk
Exec=/home/pi/lmrc-launcher/kiosk-start.sh
X-GNOME-Autostart-enabled=true
```

**File**: `/home/pi/lmrc-launcher/kiosk-start.sh`

```bash
#!/bin/bash

# Wait for launcher to be ready
sleep 10

# Disable screen blanking
xset s off
xset -dpms
xset s noblank

# Start Chromium in kiosk mode
chromium-browser \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-pinch \
  --overscroll-history-navigation=0 \
  --app=http://localhost &

# Monitor and restart if crashed
while true; do
  sleep 60
  if ! pgrep -f chromium-browser > /dev/null; then
    chromium-browser --kiosk --app=http://localhost &
  fi
done
```

---

## Deployment Procedure

### Phase 1: Setup Shared Configuration

```bash
# Create config directory
sudo mkdir -p /home/pi/lmrc-config/assets
sudo chown -R pi:pi /home/pi/lmrc-config

# Copy shared config
cp config-template.json /home/pi/lmrc-config/config.json

# Copy club logo
cp lmrc-logo.png /home/pi/lmrc-config/assets/
```

### Phase 2: Deploy Launcher

```bash
# Clone/copy launcher app
cd /home/pi
git clone <launcher-repo> lmrc-launcher
cd lmrc-launcher
npm install
```

### Phase 3: Deploy Applications

```bash
# Deploy Booking Viewer (modify for shared config)
cd /home/pi/lmrc-booking-system
npm install
npm run build

# Deploy Noticeboard (modify for shared config)
cd /home/pi/Noticeboard
npm install
npm run build
```

### Phase 4: Configure PM2

```bash
# Start with ecosystem file
pm2 start /home/pi/lmrc-ecosystem.config.js

# Initially stop apps (launcher controls them)
pm2 stop lmrc-booking-viewer
pm2 stop lmrc-noticeboard

# Save and enable startup
pm2 save
pm2 startup
```

### Phase 5: Configure Kiosk

```bash
# Make kiosk script executable
chmod +x /home/pi/lmrc-launcher/kiosk-start.sh

# Copy autostart file
mkdir -p ~/.config/autostart
cp lmrc-kiosk.desktop ~/.config/autostart/

# Reboot
sudo reboot
```

---

## Benefits of This Solution

### 1. **Clean Separation**
- Each app runs independently
- No code coupling between apps
- Easy to update either app without affecting the other

### 2. **Resource Efficiency**
- Only active app makes RevSport calls
- Inactive app completely stopped (no CPU/network usage)
- Launcher is lightweight (~10MB RAM)

### 3. **Easy Switching**
- Web-based control panel
- Can switch via SSH/API
- No manual configuration editing
- Graceful startup/shutdown

### 4. **Shared Configuration**
- Single source of truth for common settings
- Easy to update branding across both apps
- Credentials stored in one secure location
- Apps can fall back to local config

### 5. **Maintainability**
- PM2 handles auto-restart on crash
- Centralized logging
- Health monitoring built-in
- Can update apps independently

### 6. **Scalability**
- Easy to add third app in future
- Can run multiple instances if needed
- Could serve multiple displays from one Pi

---

## Alternative Approaches Considered

### Option 1: Nginx Reverse Proxy
**Pros**: Industry standard, high performance
**Cons**: Both apps always running, wasting resources, more complex setup
**Verdict**: Overkill for single Pi, doesn't meet "inactive app idle" requirement

### Option 2: Single Unified App
**Pros**: Simpler deployment, native config sharing
**Cons**: Major refactoring, coupling, harder to maintain separately
**Verdict**: Too much work, reduces modularity

### Option 3: systemd Services
**Pros**: Native Linux, no PM2 dependency
**Cons**: More manual config, no web-based switching, harder to debug
**Verdict**: Less user-friendly than PM2 approach

### Option 4: Docker Containers
**Pros**: Ultimate isolation, easy scaling
**Cons**: Overhead on Pi, complexity, resource usage
**Verdict**: Too heavy for Pi 4/5, designed for cloud deployments

---

## Implementation Effort Estimate

### Development Work
- **Launcher Application**: 8-12 hours
  - Express server with reverse proxy: 3 hours
  - PM2 controller wrapper: 2 hours
  - Control panel UI: 2 hours
  - Health monitoring: 1 hour
  - Testing: 4 hours

- **Booking Viewer Modifications**: 2-3 hours
  - Shared config integration: 1 hour
  - Port configuration: 0.5 hour
  - Testing: 1.5 hours

- **Noticeboard Modifications**: 2-3 hours
  - Shared config integration: 1 hour
  - Port configuration: 0.5 hour
  - Testing: 1.5 hours

- **Documentation & Deployment Scripts**: 4-6 hours
  - Deployment guide: 2 hours
  - Setup scripts: 2 hours
  - Testing on fresh Pi: 2 hours

**Total Estimate**: 16-24 hours

---

## Security Considerations

1. **Credential Storage**
   - Shared config file readable only by pi user
   - chmod 600 /home/pi/lmrc-config/config.json
   - Never commit credentials to git

2. **Launcher Access**
   - Running on port 80 (requires sudo or capability)
   - Consider adding basic auth for control panel
   - Only accessible from localhost by default

3. **Network Exposure**
   - Apps bound to 0.0.0.0 for launcher access
   - Raspberry Pi should be on trusted network
   - Consider firewall rules for external access

---

## Monitoring & Troubleshooting

### Health Checks
```bash
# Check all processes
pm2 status

# Check launcher logs
pm2 logs lmrc-launcher

# Check active app
curl http://localhost/api/apps

# Manual switch
curl -X POST http://localhost/api/switch -H "Content-Type: application/json" -d '{"app":"noticeboard"}'
```

### Common Issues

**Issue**: Launcher can't start apps
- Check PM2 is running: `pm2 status`
- Check app scripts exist and are executable
- Check ecosystem config paths

**Issue**: Apps can't read shared config
- Check file permissions: `ls -l /home/pi/lmrc-config/config.json`
- Check LMRC_CONFIG env var: `pm2 env <app-name>`
- Check JSON syntax: `node -e "console.log(require('/home/pi/lmrc-config/config.json'))"`

**Issue**: Kiosk not starting
- Check autostart file: `cat ~/.config/autostart/lmrc-kiosk.desktop`
- Check script permissions: `ls -l /home/pi/lmrc-launcher/kiosk-start.sh`
- Test manually: `bash /home/pi/lmrc-launcher/kiosk-start.sh`

---

## Future Enhancements

1. **Scheduled Switching**
   - Configure time-based switching (e.g., booking viewer on race days)
   - API: `POST /api/schedule` with cron expression

2. **Multi-Display Support**
   - Support multiple HDMI outputs
   - Different app on each display
   - Synchronized switching

3. **Mobile Control App**
   - iOS/Android app to control switching
   - Push notifications for status changes
   - Remote monitoring

4. **Analytics Dashboard**
   - Track app usage (uptime per app)
   - RevSport API call metrics
   - Resource usage graphs

5. **A/B Testing**
   - Switch between apps on schedule
   - Collect feedback/preferences
   - Analytics on user engagement

---

## Conclusion

The **PM2-Managed Multi-App with Configuration Launcher** approach provides the optimal balance of:
- **Simplicity**: Easy to understand and maintain
- **Efficiency**: Only active app consumes resources
- **Flexibility**: Easy switching and configuration
- **Reliability**: PM2-managed processes with auto-restart
- **Maintainability**: Clear separation, shared config, centralized control

This solution meets all requirements while remaining pragmatic and avoiding over-engineering.

---

**Next Steps**:
1. Review and approve this architectural design
2. Develop launcher application prototype
3. Modify both applications for shared config support
4. Test on development environment
5. Deploy to test Raspberry Pi
6. Create production deployment scripts
7. Document operational procedures

