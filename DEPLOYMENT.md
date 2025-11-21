# LMRC Booking Viewer - Deployment Guide

## Production Deployment

**This application is deployed via the [LMRC Pi Deployment System](../lmrc-pi-deployment/).**

The booking viewer is one of two applications managed by the dual-app deployment infrastructure. Do not deploy this application standalone in production.

### 🎯 For Production

👉 **Follow the guide at**: [lmrc-pi-deployment/README.md](../lmrc-pi-deployment/README.md)

The production deployment system provides:
- ✅ **systemd service management** - Professional process management with auto-restart
- ✅ **Dual-app support** - Switch between Booking Viewer and Noticeboard
- ✅ **Kiosk mode** - Full-screen Chromium for TV displays
- ✅ **Centralized credentials** - Shared RevSport authentication
- ✅ **Easy management** - Simple scripts for status, switching, updates

### Directory Structure (Production)

```
/opt/lmrc/
├── booking-viewer/          # This application (deployed here)
├── noticeboard/             # Noticeboard application
├── deployment/              # Deployment infrastructure
└── shared/                  # Shared configuration
    ├── config/
    │   ├── device-config.json     # Active app selection
    │   └── credentials.env        # RevSport credentials
    └── scripts/
        ├── switch-app.sh          # Switch between apps
        ├── status.sh              # Check status
        └── update.sh              # Update applications
```

### Quick Reference

**Check status:**
```bash
/opt/lmrc/shared/scripts/status.sh
```

**Update booking viewer:**
```bash
sudo /opt/lmrc/shared/scripts/update.sh
```

**View logs:**
```bash
sudo journalctl -u lmrc-booking-viewer -f
```

**Restart service:**
```bash
sudo systemctl restart lmrc-booking-viewer
```

---

## Development Deployment

### Option 1: Docker (Recommended for Development)

```bash
docker build -t lmrc-booking-viewer .
docker run -p 3001:3001 --env-file .env lmrc-booking-viewer
```

### Option 2: Local Development

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit credentials
nano .env

# Run in development mode
npm run dev

# Or build and run production build
npm run build
npm start
```

Access at: `http://localhost:3001`

### Option 3: Legacy PM2 Deployment (Not Recommended)

⚠️ **Deprecated** - For development/testing only

See [DEPLOY-PI.md](DEPLOY-PI.md) for legacy PM2 deployment instructions.

**Note**: This is kept for backward compatibility only. Production deployments should use the dual-app system.

---

## Architecture

This is a Node.js/Express application that:
1. Fetches boat booking data from RevSport
2. Serves a web interface showing 7-day booking calendar
3. Provides a TV display mode for digital signage
4. Caches data to reduce RevSport load

**Technology Stack:**
- **Backend**: Node.js, Express, TypeScript
- **Data fetching**: Axios with cookie jar support
- **HTML parsing**: Cheerio
- **Frontend**: Vanilla JavaScript, HTML, CSS
- **Process management** (production): systemd
- **Testing**: Vitest (86% coverage)

---

## Testing

This application has comprehensive test coverage (86%):

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

See [.claude/BASELINE_TESTING_COMPLETE.md](../.claude/BASELINE_TESTING_COMPLETE.md) for test results.

---

## Configuration

### Production (systemd deployment)

Configuration is managed by the dual-app deployment system:
- **Credentials**: `/opt/lmrc/shared/config/credentials.env`
- **Device config**: `/opt/lmrc/shared/config/device-config.json`
- **App .env**: `/opt/lmrc/booking-viewer/.env` (symlink to shared credentials)

### Development (local/PM2)

Create `.env` file from template:

```bash
cp .env.example .env
```

Required environment variables:
```env
# RevSport Configuration
REVSPORT_BASE_URL=https://www.lakemacquarierowingclub.org.au
REVSPORT_USERNAME=your_username
REVSPORT_PASSWORD=your_password

# Server Configuration
PORT=3001

# Debug mode (optional)
REVSPORT_DEBUG=false

# Session times (HH:MM format)
SESSION_1_START=06:30
SESSION_1_END=07:30
SESSION_2_START=07:30
SESSION_2_END=08:30
```

---

## Updating Production Deployment

**After code changes:**

```bash
# SSH into the Pi
ssh greg@<pi-ip-address>

# Run the update script
sudo /opt/lmrc/shared/scripts/update.sh
```

The update script will:
1. Pull latest code from GitHub
2. Install any new dependencies
3. Build the application
4. Restart the service
5. Verify it's running

**Manual update (if needed):**

```bash
cd /opt/lmrc/booking-viewer
sudo -u lmrc git pull origin main
sudo -u lmrc npm install
sudo -u lmrc npm run build
sudo systemctl restart lmrc-booking-viewer
sudo journalctl -u lmrc-booking-viewer -n 20
```

---

## Support

- **Deployment issues**: See [lmrc-pi-deployment/docs/TROUBLESHOOTING.md](../lmrc-pi-deployment/docs/TROUBLESHOOTING.md)
- **Application issues**: Check application logs
- **Test failures**: Run `npm test` to see details

---

## Related Documentation

- [Production Deployment Guide](../lmrc-pi-deployment/README.md) - **Start here for production**
- [Testing Strategy](../.claude/TESTING_STRATEGY.md)
- [Test Coverage Results](../.claude/BASELINE_TESTING_COMPLETE.md)
- [Implementation Plan](../IMPLEMENTATION_PLAN.md)
- [Legacy PM2 Deployment](DEPLOY-PI.md) - Deprecated, dev only
