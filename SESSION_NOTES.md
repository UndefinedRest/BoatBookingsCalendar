# Development Session Notes

This file tracks important implementation details, decisions, and context from development sessions.

---

## Session: 2025-10-29 - v1.0.0 Release

### Critical Authentication Fixes (Cloudflare Block Prevention)

**Problem**: RevSport reported "multiple failed login attempts" causing Cloudflare to block the IP.

**Root Cause**: When fetching 42 boats in parallel, if Cloudflare returned 403 for rate limiting, each 403 triggered an immediate re-login attempt, resulting in 42 simultaneous login retries.

**Solution Implemented**:

1. **Batched Request Processing** ([src/services/bookingService.ts](src/services/bookingService.ts:37-70))
   - Changed from 42 parallel requests to batches of 5 boats
   - 500ms delay between batches
   - Fetch time increased from ~2s to ~5-7s (acceptable tradeoff for reliability)
   - Log format: `[BookingService] DEBUG: Processing batch X/10 (5 boats)`

2. **Login Mutex** ([src/client/auth.ts](src/client/auth.ts:19,59-80))
   - Added `loginPromise` property to prevent concurrent login attempts
   - Multiple 403 errors now wait for a single login instead of creating a login storm
   - Implementation: If login already in progress, subsequent calls wait for the same promise

3. **Exponential Retry Backoff** ([src/client/auth.ts](src/client/auth.ts:299-319))
   - Added `retryCount` parameter to `get()` method
   - Delays: 1s, 2s before retries
   - Maximum 2 retry attempts to prevent infinite loops
   - Throws error if max retries exceeded

4. **Prominent 403 Error Logging** ([src/client/auth.ts](src/client/auth.ts:188-207,284-296))
   - Clear 🚫 emoji markers for easy log scanning
   - Detailed error context (URL, status, headers)
   - Separate logging for login 403s vs data fetch 403s
   - User requested: "please ensure that any 403 responses are clearly logged so we can diagnose this in the future"

5. **Password Encoding Validation** ([src/client/auth.ts](src/client/auth.ts:24-34))
   - Logs password characteristics (length, special characters) at startup
   - Helps diagnose encoding issues without exposing the actual password
   - Uses explicit URLSearchParams encoding for form data

### UX Improvements

**Silent Background Updates** ([public/js/tv-display.js](public/js/tv-display.js:34,213-278))
- Problem: 4-5 second fetch time showed loading screen, interrupting viewers
- Solution: Track `isInitialLoad` flag
  - First load: Show loading screen
  - Subsequent refreshes: Update silently in background
  - On error: Keep showing old data instead of error screen
- User experience: Seamless updates every 10 minutes with no interruption

**Configurable Logo**
- Schema: [src/models/tv-display-config.ts](src/models/tv-display-config.ts:40,98)
- Config: [config/tv-display.json](config/tv-display.json:18-21) (ignored by git)
- HTML: [public/config.html](public/config.html:147-153)
- JavaScript: [public/js/config.js](public/js/config.js:164-166,237)
- Display: [public/js/tv-display.js](public/js/tv-display.js:24,158-162)
- HTML: [public/index.html](public/index.html:59) - src="" initially, set by JS
- Local fallback: [public/images/lmrc-logo.png](public/images/lmrc-logo.png) (306KB)
- Default URL: `https://cdn.revolutionise.com.au/cups/lmrc2019/files/xhvxfyonk8gzzlr4.png`

### Deployment Process

**Issues Encountered**:
1. **Missing deployment scripts** - lmrc-pi-deployment folder not on Pi
   - Solution: Cloned from GitHub: `https://github.com/UndefinedRest/lmrc-pi-deployment.git`

2. **Script permissions** - update.sh not executable
   - Solution: `sudo chmod +x /opt/lmrc/lmrc-pi-deployment/scripts/*.sh`

3. **Git merge conflict** - Untracked `public/images/lmrc-logo.png` conflicted with incoming commit
   - Solution: `sudo -u lmrc rm public/images/lmrc-logo.png` before pull

4. **Git dubious ownership** - Git blocked operations on /opt/lmrc/ directories
   - Solution: Added safe directories:
     ```bash
     sudo git config --global --add safe.directory /opt/lmrc/booking-viewer
     sudo git config --global --add safe.directory /opt/lmrc/noticeboard
     ```

**Successful Deployment**:
- Used update.sh script from lmrc-pi-deployment repository
- Script automatically: pulls changes, installs dependencies, builds app, restarts service
- Service running successfully in production mode
- 304 responses (Not Modified) indicate efficient HTTP caching working correctly

### Git Repository Details

**Booking Viewer**: `https://github.com/UndefinedRest/BoatBookingsCalendar`
- Commit: `a42140b` - "Fix authentication issues and add configurable logo"
- Tag: `v1.0.0` - Production release (2025-10-29)
- Files changed: 9 files, 676 insertions, 35 deletions

**Deployment Scripts**: `https://github.com/UndefinedRest/lmrc-pi-deployment`
- Location on Pi: `/opt/lmrc/lmrc-pi-deployment/`
- Key script: `scripts/update.sh` - Updates both apps from GitHub

### Configuration

**TV Display Config** ([config/tv-display.json](config/tv-display.json)):
```json
{
  "version": 3,
  "display": {
    "memberNameFormat": "full",
    "logoUrl": "https://cdn.revolutionise.com.au/cups/lmrc2019/files/xhvxfyonk8gzzlr4.png"
  }
}
```

**Cache Settings**:
- TTL: 600s (10 minutes)
- Auto-refresh: 600s (10 minutes)
- Config check interval: 30s

### Monitoring

**What to Watch For**:
- 🚫 403 errors in logs (should be rare/none now)
- Batch processing logs: `Processing batch X/10`
- Fetch times: ~5-7 seconds (batched) vs ~2 seconds (parallel)
- Logo loading from CDN

**Log Commands**:
```bash
# Watch for authentication issues
sudo tail -f /opt/lmrc/shared/logs/booking-viewer.log | grep -E "batch|🚫|403"

# Check service status
sudo systemctl status lmrc-booking-viewer

# View recent logs
sudo tail -50 /opt/lmrc/shared/logs/booking-viewer.log
```

### Testing Checklist

- [x] Authentication fixes prevent login storms
- [x] Batched requests working (5 at a time)
- [x] Silent background updates (no loading screen)
- [x] Logo displays in footer
- [x] Logo configurable via config page
- [x] Config changes detected within 30s
- [x] Service runs in production mode
- [x] Deployed successfully to Raspberry Pi

### Performance Metrics

**Before**:
- 42 parallel requests
- ~2 seconds total fetch time
- Cloudflare blocks after a few hours

**After**:
- 10 batches of 5 requests (+ 1 batch of 1)
- ~5-7 seconds total fetch time
- 500ms delays between batches
- Expected: No Cloudflare blocks

### Next Steps

1. Monitor for 24-48 hours for any Cloudflare blocks
2. If no issues, contact RevSport to confirm IP is unblocked
3. Consider additional optimizations if needed

### User Feedback

- User confirmed: "looks good on the local server"
- User confirmed: Deployment successful on Pi
- User confirmed: "it looks good, although there are a lot of 304 response entries" (explained as expected HTTP caching)
- User requested: v1.0.0 tag created and pushed

---

## Key Technical Decisions

### Why Batching vs Other Solutions?

**Considered Approaches**:
1. Reduce parallel requests (chosen)
2. Increase delays between requests
3. Request IP whitelisting from RevSport
4. Use alternative data access methods

**Rationale for Batching**:
- Immediate fix without external dependencies
- Reduces request rate by 82% during peak load
- Maintains reasonable user experience (~5s fetch time)
- Provides clear logging for monitoring

### Why Login Mutex?

Without mutex: 42 parallel requests → All get 403 → 42 simultaneous login attempts → "multiple failed login attempts"

With mutex: 42 parallel requests → All get 403 → Wait for single login → Retry with valid session

### Why Silent Updates?

User experience priority: Viewers should never see interruptions during the 10-minute refresh cycle. Loading screen is acceptable only on initial page load.

---

## Repository Structure Reference

```
lmrc-booking-system/
├── src/
│   ├── client/
│   │   └── auth.ts              # Authentication with mutex and logging
│   ├── services/
│   │   └── bookingService.ts    # Batched request processing
│   └── models/
│       └── tv-display-config.ts # Schema with logo URL
├── public/
│   ├── js/
│   │   ├── tv-display.js        # Silent background updates
│   │   └── config.js            # Logo URL configuration
│   ├── images/
│   │   └── lmrc-logo.png        # Local fallback (306KB)
│   ├── config.html              # Config page with logo URL field
│   └── index.html               # TV display
├── config/
│   └── tv-display.json          # User config (gitignored)
└── AUTHENTICATION_FIX_PROPOSAL.md # Detailed analysis

lmrc-pi-deployment/
├── scripts/
│   ├── update.sh                # Update both apps from GitHub
│   ├── install.sh               # Fresh installation
│   └── launcher.sh              # Boot-time launcher
└── systemd/
    ├── lmrc-booking-viewer.service
    ├── lmrc-noticeboard.service
    └── lmrc-kiosk.service
```

---

## Troubleshooting Guide

### Issue: "multiple failed login attempts"
**Symptom**: RevSport blocks IP, Cloudflare 403 errors
**Solution**: Authentication fixes in v1.0.0 prevent this
**Monitor**: Look for 🚫 403 errors in logs

### Issue: Loading screen interrupting display
**Symptom**: Screen goes blank during 10-minute refresh
**Solution**: Silent background updates in v1.0.0
**Expected**: Only initial load shows loading screen

### Issue: Logo not displaying
**Check**:
1. Config page: http://pi-hostname:3000/config.html
2. Verify logoUrl is set in Display Options
3. Check browser console for image load errors
4. Fallback: Local image at `/images/lmrc-logo.png`

### Issue: Git operations failing on Pi
**Symptom**: "dubious ownership" or permission errors
**Solution**:
```bash
sudo git config --global --add safe.directory /opt/lmrc/booking-viewer
sudo git config --global --add safe.directory /opt/lmrc/noticeboard
```

### Issue: Update script not found
**Symptom**: `command not found` when running update.sh
**Solution**:
```bash
sudo chmod +x /opt/lmrc/lmrc-pi-deployment/scripts/*.sh
```
