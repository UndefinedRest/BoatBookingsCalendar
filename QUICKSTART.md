# Quick Start Guide

Get the LMRC Booking Viewer running in 5 minutes!

---

## For First-Time Users

### Step 1: Install Node.js

**Windows/Mac:**
Download and install from [nodejs.org](https://nodejs.org/) (version 20 or higher)

**Linux:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Verify installation:
```bash
node --version  # Should show v20.x or higher
```

---

### Step 2: Download the Application

```bash
# Clone the repository
git clone https://github.com/UndefinedRest/BoatBookingsCalendar.git
cd BoatBookingsCalendar

# Install dependencies
npm install
```

---

### Step 3: Configure Credentials

```bash
# Copy the example environment file
cp .env.example .env
```

**Edit `.env` file with your details:**

```env
# Your RevSport credentials
REVSPORT_USERNAME=your_username_here
REVSPORT_PASSWORD=your_password_here

# Everything else can stay as default
```

**Windows users:** Use Notepad or VS Code to edit `.env`

**Mac/Linux users:** Use nano, vim, or any text editor
```bash
nano .env
```

---

### Step 4: Start the Web Server

```bash
npm run dev:server
```

You should see:
```
✓ Lake Macquarie Rowing Club - Booking Viewer
Server: http://0.0.0.0:3000
✓ Server started successfully
```

---

### Step 5: Open in Browser

Open your web browser and go to:

**http://localhost:3000**

You should see the booking calendar! 🎉

---

## Common Issues

### ❌ "Command not found: npm"
**Solution:** Node.js is not installed. Go back to Step 1.

### ❌ "Login failed" or "Not authenticated"
**Solution:** Check your username and password in the `.env` file.

### ❌ "Port 3000 is already in use"
**Solution:** Change the port in `.env`:
```env
PORT=3001
```
Then go to http://localhost:3001

### ❌ "Cannot GET /"
**Solution:** Make sure you built the frontend:
```bash
npm run build:frontend
```

---

## Next Steps

### View Just the Data (CLI Mode)

If you just want to fetch data without the web interface:

```bash
npm run fetch
```

Output files will be created:
- `weekly-bookings.json` - Full data
- `weekly-bookings-summary.txt` - Human-readable summary

### Customize the Look

Edit `.env` to change colors and club name:

```env
CLUB_NAME=Your Club Name
CLUB_PRIMARY_COLOR=#1e40af
CLUB_SECONDARY_COLOR=#0ea5e9
```

Restart the server to see changes:
- Press Ctrl+C to stop
- Run `npm run dev:server` again

### Update Session Times (Seasonal)

Edit `.env` to match your club's session times:

```env
SESSION_1_START=06:00
SESSION_1_END=07:00
SESSION_2_START=07:00
SESSION_2_END=08:00
```

---

## Keeping It Running

### Run in Background (Recommended for Production)

Instead of `npm run dev:server`, use PM2:

```bash
# Install PM2 globally
npm install -g pm2

# Build the production version
npm run build

# Start with PM2
pm2 start dist/server/index.js --name lmrc-booking-viewer

# Make it start automatically on reboot
pm2 save
pm2 startup
```

Now it runs in the background!

**Useful PM2 commands:**
```bash
pm2 status              # See if it's running
pm2 logs                # View logs
pm2 restart all         # Restart after changes
pm2 stop all            # Stop the server
```

---

## Production Deployment

For deploying to a real server, see [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions including:
- SSL/HTTPS setup
- Nginx reverse proxy
- Docker deployment
- Security hardening

---

## Getting Help

### Check the Logs

If something goes wrong, the logs will tell you what happened:

```bash
# If using dev:server
# Logs appear in the terminal

# If using PM2
pm2 logs lmrc-booking-viewer
```

### Test the API Directly

```bash
# Check if the server is running
curl http://localhost:3000/api/v1/health

# Should return:
# {"success":true,"data":{"status":"ok",...}}
```

### Still Stuck?

1. Check [README.md](README.md) for full documentation
2. Check [GitHub Issues](https://github.com/UndefinedRest/BoatBookingsCalendar/issues)
3. Create a new issue with:
   - What you tried to do
   - What happened
   - Error messages from logs

---

## Cheat Sheet

### Essential Commands

```bash
# Start development server (with auto-reload)
npm run dev:server

# Fetch data only (no web server)
npm run fetch

# Build for production
npm run build

# Start production server
npm run start:server

# Check for errors
npm run type-check
```

### Common File Locations

- **Configuration:** `.env`
- **Web page:** `public/index.html`
- **Styling:** `public/css/styles.css`
- **API endpoints:** `src/server/routes/api.ts`
- **Output data:** `weekly-bookings.json`

---

## What You Should See

### In Your Browser (http://localhost:3000)

```
Lake Macquarie Rowing Club - Booking Calendar

Total Boats: 42    Total Bookings: 4    Next refresh: 9:45

┌─────────────────────────────────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┐
│ Boat                            │ Sun  │ Mon  │ Tue  │ Wed  │ Thu  │ Fri  │ Sat  │
├─────────────────────────────────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│ QUADS & FOURS                   │      │      │      │      │      │      │      │
├─────────────────────────────────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│ Ausrowtec coxed quad/four Hunter│  —   │  —   │  —   │  —   │  —   │  —   │  —   │
│ Johnson Racing Quad             │  —   │  —   │  —   │  —   │  —   │  —   │  —   │
│ ...                             │      │      │      │      │      │      │      │
├─────────────────────────────────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│ DOUBLES                         │      │      │      │      │      │      │      │
├─────────────────────────────────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│ Wintech Competitor Double Scull │      │06:30 │      │07:30 │      │      │      │
│                                 │      │Greg  │      │Rob   │      │      │      │
│ ...                             │      │      │      │      │      │      │      │
└─────────────────────────────────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┘
```

### In the Terminal

```
[Server] ✓ ================================================================================
[Server] ✓ Lake Macquarie Rowing Club - Booking Viewer
[Server] ✓ ================================================================================
[Server] Environment: development
[Server] Server: http://0.0.0.0:3000
[Server] API: http://0.0.0.0:3000/api/v1
[Server] Cache TTL: 600s
[Server] Auto-refresh: 600s
[Server] ✓ ================================================================================
[Server] ✓ Server started successfully
```

---

## Tips & Tricks

### 💡 Tip 1: Auto-reload During Development

When you run `npm run dev:server`, the server automatically restarts when you change backend code!

### 💡 Tip 2: Clear the Cache

If data seems stale:

```bash
curl -X POST http://localhost:3000/api/v1/cache/clear
```

Or just wait 10 minutes for auto-refresh.

### 💡 Tip 3: Force Refresh

Add `?refresh=true` to the API URL:

```
http://localhost:3000/api/v1/bookings?refresh=true
```

### 💡 Tip 4: Mobile-Friendly

The calendar works great on phones! Just visit the URL from your mobile browser.

### 💡 Tip 5: Printer-Friendly

The page has print styles built-in. Just use your browser's Print function (Ctrl+P or Cmd+P).

---

## Success! What's Next?

Now that you have it running:

1. **Bookmark it** - Add http://localhost:3000 to your bookmarks
2. **Share it** - If on a server, share the URL with your club
3. **Automate it** - Set up PM2 to keep it running 24/7
4. **Customize it** - Change colors, session times, etc. in `.env`
5. **Deploy it** - See DEPLOYMENT.md for production setup

---

**That's it! You're all set.** 🚀

Need more details? Check out:
- [README.md](README.md) - Full documentation
- [DEPLOYMENT.md](DEPLOYMENT.md) - Production deployment
- [GitHub](https://github.com/UndefinedRest/BoatBookingsCalendar) - Source code

---

**Version:** 3.0.0
**Last Updated:** October 2025
