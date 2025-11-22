# LMRC Booking Viewer

Modern TypeScript application that fetches and displays 7-day booking views for Lake Macquarie Rowing Club boats from RevolutioniseSport.

**✨ Version 1.0.0 - Production Release** 🎉

> 📚 **Part of the LMRC Digital Solution Suite**
>
> This is one component of a multi-project solution. For complete documentation:
> - **Solution documentation** → See [../docs/](../docs/)
> - **Architecture overview** → See [../docs/architecture/overview.md](../docs/architecture/overview.md)
> - **Product roadmap** → See [../docs/planning/roadmap.md](../docs/planning/roadmap.md)
> - **Deployment to Raspberry Pi** → See [../docs/deployment/production-setup.md](../docs/deployment/production-setup.md)
> - **Getting started (dev)** → See [../docs/development/getting-started.md](../docs/development/getting-started.md)

## Features

### Core Features
- ⚡ **Reliable performance** - Batched request processing prevents rate limiting
- 🎯 **API-first approach** - Uses RevSport's JSON API with date range parameters
- 🔒 **Type-safe** - TypeScript with runtime validation (Zod schemas)
- ✅ **Session validation** - Flags bookings outside standard morning sessions
- 🔧 **Configurable** - Club name, branding, session times, logo all configurable
- 📊 **Complete visibility** - Shows ALL boats, even those with no bookings
- 📈 **Utilization tracking** - Calculates availability percentages for each boat
- 🛡️ **Cloudflare-safe** - Intelligent batching and retry logic prevents IP blocks

### Web Interface
- 🌐 **TV Display Mode** - Full-screen two-column layout for digital signage
- 🔄 **Silent background updates** - No loading screen interruptions during refresh
- 🎨 **Comprehensive configuration** - Colors, typography, layout via web UI
- 🖼️ **Configurable logo** - Set club logo URL via config page
- 📱 **Modern UI** - Clean, professional design optimized for TV displays
- ⚡ **Smart caching** - 10-minute cache TTL to minimize API calls
- 🔌 **REST API** - JSON endpoints for integration

### CLI Tool
- 📄 **Dual output** - Both JSON (machine-readable) and text (human-readable) formats
- 🖥️ **Standalone fetch** - Can run independently for automation

---

## Quick Start

### Prerequisites

- Node.js 20+
- Valid RevSport credentials for LMRC

### Installation

```bash
# Clone the repository
git clone https://github.com/UndefinedRest/BoatBookingsCalendar.git
cd BoatBookingsCalendar

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
# (Update REVSPORT_USERNAME and REVSPORT_PASSWORD)
```

### Environment Configuration

Edit `.env` with your settings:

```env
# RevSport Credentials
REVSPORT_BASE_URL=https://www.lakemacquarierowingclub.org.au
REVSPORT_USERNAME=your_username
REVSPORT_PASSWORD=your_password

# Club Configuration
CLUB_NAME=Lake Macquarie Rowing Club
CLUB_SHORT_NAME=LMRC
CLUB_PRIMARY_COLOR=#1e40af
CLUB_SECONDARY_COLOR=#0ea5e9

# Session Times (update seasonally)
SESSION_1_START=06:30
SESSION_1_END=07:30
SESSION_2_START=07:30
SESSION_2_END=08:30

# Server Configuration (optional)
PORT=3000
HOST=0.0.0.0
CACHE_TTL=600000         # 10 minutes
REFRESH_INTERVAL=600000  # 10 minutes
```

---

## Usage

### Web Server (Recommended)

Start the web server to view the calendar in your browser:

```bash
# Development mode (with auto-reload)
npm run dev:server

# Production mode
npm run build
npm run start:server
```

Then open your browser to: **http://localhost:3000**

#### Web Features:
- **Calendar View** - See all boats grouped by type (Quads → Doubles → Singles)
- **7-Day View** - Today plus next 6 days
- **Auto-refresh** - Page automatically updates every 10 minutes
- **Responsive** - Works on desktop, tablet, and mobile
- **Real-time** - Shows booking status with color-coded sessions

### CLI Tool

Fetch booking data and save to files:

```bash
# Run the booking fetch
npm run fetch

# Or for development (with detailed logging)
npm run dev
```

#### Output Files:
- **`weekly-bookings.json`** - Complete structured data for all boats
- **`weekly-bookings-summary.txt`** - Human-readable summary

---

## API Reference

The web server exposes a REST API for integration:

### GET /api/v1/bookings

Fetch all booking data (cached for 10 minutes).

**Query Parameters:**
- `refresh=true` - Force cache refresh

**Response:**
```json
{
  "success": true,
  "data": {
    "boats": [...],
    "metadata": {
      "generatedAt": "2025-10-26T01:42:57.281Z",
      "weekStart": "2025-10-25T13:00:00.000Z",
      "weekEnd": "2025-11-01T13:00:00.000Z",
      "totalBoats": 42,
      "totalBookings": 4,
      "cacheExpires": "2025-10-26T01:52:57.281Z"
    }
  }
}
```

### GET /api/v1/config

Get club configuration.

**Response:**
```json
{
  "success": true,
  "data": {
    "club": {
      "name": "Lake Macquarie Rowing Club",
      "shortName": "LMRC",
      "branding": {
        "primaryColor": "#1e40af",
        "secondaryColor": "#0ea5e9"
      },
      "sessions": {
        "morning1": { "start": "06:30", "end": "07:30" },
        "morning2": { "start": "07:30", "end": "08:30" }
      }
    },
    "refreshInterval": 600000
  }
}
```

### GET /api/v1/health

Health check endpoint.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2025-10-26T01:43:49.041Z",
    "cache": {
      "isCached": true,
      "expiresAt": "2025-10-26T01:52:57.281Z",
      "age": 51760
    }
  }
}
```

### POST /api/v1/cache/clear

Clear the booking cache (useful for testing).

---

## Architecture

### Technology Stack

**Backend:**
- Express.js - Web server
- TypeScript - Type safety
- Axios - HTTP client with cookie jar
- Cheerio - HTML parsing (for boat list)
- Zod - Runtime validation
- Helmet - Security headers
- Morgan - Request logging

**Frontend:**
- TypeScript - Compiled to vanilla JavaScript
- Modern CSS - Custom responsive design
- No frameworks - Lightweight and fast

### Project Structure

```
lmrc-booking-viewer/
├── src/
│   ├── client/
│   │   └── auth.ts              # RevSport authentication
│   ├── config/
│   │   ├── config.ts            # App configuration
│   │   ├── club.ts              # Club-specific settings
│   │   └── server.ts            # Server configuration
│   ├── models/
│   │   ├── schemas.ts           # Zod validation schemas
│   │   └── types.ts             # TypeScript types
│   ├── services/
│   │   ├── assetService.ts      # Fetch boats
│   │   ├── bookingService.ts    # Fetch bookings
│   │   └── boatGroupingService.ts # Group & sort boats
│   ├── server/
│   │   ├── app.ts               # Express app setup
│   │   ├── index.ts             # Server entry point
│   │   ├── middleware/
│   │   │   └── errorHandler.ts  # Error handling
│   │   ├── routes/
│   │   │   └── api.ts           # API routes
│   │   └── services/
│   │       └── bookingCache.ts  # Caching layer
│   ├── utils/
│   │   └── logger.ts            # Logging utility
│   └── index.ts                 # CLI entry point
├── frontend/
│   └── src/
│       └── app.ts               # Frontend TypeScript
├── public/
│   ├── css/
│   │   └── styles.css           # Styling
│   ├── js/
│   │   └── app.js               # Compiled frontend
│   └── index.html               # Web page
├── .env                         # Configuration
└── package.json
```

### How It Works

1. **Authentication** - Logs into RevSport using CSRF token + credentials
2. **Fetch Assets** - Scrapes `/bookings` page to get list of all boats (HTML)
3. **Fetch Bookings** - Parallel API calls to `/bookings/retrieve-calendar/{id}` (JSON)
4. **Group & Sort** - Boats grouped by type, sorted alphabetically within groups
5. **Cache** - Server caches data for 10 minutes to avoid excessive API calls
6. **Display** - Web UI shows calendar table with auto-refresh

---

## Deployment

### Option 1: Simple VPS/Server

```bash
# Build the application
npm run build

# Start with PM2 (recommended for production)
npm install -g pm2
pm2 start dist/server/index.js --name lmrc-booking-viewer
pm2 save
pm2 startup

# Or use systemd
sudo cp lmrc-booking-viewer.service /etc/systemd/system/
sudo systemctl enable lmrc-booking-viewer
sudo systemctl start lmrc-booking-viewer
```

### Option 2: Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/server/index.js"]
```

```bash
docker build -t lmrc-booking-viewer .
docker run -d -p 3000:3000 --env-file .env lmrc-booking-viewer
```

### Option 3: Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name bookings.lakemacquarierowingclub.org.au;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Option 4: Serverless (AWS Lambda)

The application can be adapted for serverless with minor modifications using:
- AWS Lambda + API Gateway
- Serve static files from S3/CloudFront
- Use Lambda function for API endpoints

---

## Configuration for Other Clubs

This application is designed to be portable to other rowing clubs using RevolutioniseSport.

### Customization Steps:

1. **Update `.env` file:**
   ```env
   CLUB_NAME=Your Rowing Club Name
   CLUB_SHORT_NAME=YRC
   REVSPORT_BASE_URL=https://www.yourclub.org.au
   CLUB_PRIMARY_COLOR=#your-color
   CLUB_SECONDARY_COLOR=#your-color
   ```

2. **Update session times** (if different):
   ```env
   SESSION_1_START=06:00
   SESSION_1_END=07:00
   SESSION_2_START=07:00
   SESSION_2_END=08:00
   ```

3. **Adjust boat grouping** (if needed):
   - Edit `src/config/club.ts`
   - Modify `boatGroups` patterns to match your boat naming conventions

4. **Optional branding:**
   - Replace logo in `public/` directory
   - Customize colors in `.env`
   - Modify `public/css/styles.css` for advanced styling

---

## Troubleshooting

### Authentication Issues

**Problem:** Login fails with 500 error
**Solution:** This is expected! RevSport returns 500 but still sets cookies. The app handles this correctly.

**Problem:** "Not authenticated" errors
**Solution:** Check your credentials in `.env` file. Make sure username/password are correct.

### Rate Limiting

**Problem:** Getting 403 Forbidden errors
**Solution:** CloudFront rate limits aggressive testing. Wait 10-15 minutes between manual test runs. In production with caching, this won't be an issue.

### Performance

**Problem:** Slow initial load
**Solution:** First request takes ~2 seconds (authentication + data fetch). Subsequent requests use cache and return in < 5ms.

**Problem:** Stale data
**Solution:** Cache TTL is 10 minutes by default. Force refresh with `GET /api/v1/bookings?refresh=true` or wait for cache expiry.

### Missing Bookings

**Problem:** Boat 8584 has bookings but shows none
**Solution:** Date range parameters are critical. The app automatically calculates today + 7 days. Check system timezone matches club timezone.

---

## Performance

**Actual Results:**
- **Total runtime:** ~2 seconds (authentication + 42 boats + processing)
- **Authentication:** ~500ms
- **Asset fetch:** ~500ms (HTML scraping)
- **Booking fetch:** ~300ms for 42 boats in parallel (~7ms per boat)
- **API response (cached):** < 5ms
- **Cache hit rate:** ~99% with 10-minute TTL and hourly updates

**Comparison to Prototype:**
- **Old sequential approach:** 12-15 seconds
- **New parallel approach:** ~2 seconds
- **Improvement:** **6× faster** ⚡

---

## Example Output

### Web Calendar View
```
QUADS & FOURS
├── Ausrowtec coxed quad/four Hunter        [Empty for 7 days]
├── Johnson Racing Quad                     [Empty for 7 days]
└── ...

DOUBLES
├── Ausrowtec double scull                  [Empty for 7 days]
├── Wintech Competitor Double Scull         [3 bookings]
│   └── Sun 27 Oct: 06:30-07:30 Greg Evans
│   └── Sat 26 Oct: 07:30-08:30 Greg Evans
│   └── Wed 29 Oct: 07:30-08:30 Robert Campbell
└── ...

SINGLES
├── Carmody single scull                    [Empty for 7 days]
└── ...
```

### CLI Text Output
```
LMRC WEEKLY BOOKING SUMMARY
================================================================================

Generated: 2025-10-26T01:42:57.281Z
Week: 2025-10-25 to 2025-11-01

Total Boats: 42
Total Bookings: 4

BOATS WITH BOOKINGS
--------------------------------------------------------------------------------

Wintech Competitor Double Scull (2X) - 3 bookings
  Utilization: 21%
  ✓ 2025-10-27 06:30-07:30 - Greg Evans
  ✓ 2025-10-26 07:30-08:30 - Greg Evans
  ✓ 2025-10-29 07:30-08:30 - Robert Campbell
```

---

## Development

### Run Tests
```bash
# Type checking
npm run type-check

# Build
npm run build

# Build frontend only
npm run build:frontend
```

### Debug Mode
```bash
# Enable debug logging
REVSPORT_DEBUG=true npm run dev:server
```

---

## Roadmap

See [../PRODUCT_ROADMAP.md](../PRODUCT_ROADMAP.md) for the comprehensive future vision including multi-club commercialization.

### Project-Specific Enhancements
- [ ] User authentication/authorization
- [ ] Booking creation from web UI
- [ ] Email notifications for new bookings
- [ ] Export to iCal format
- [ ] Historical analytics dashboard
- [ ] Mobile app (React Native)
- [ ] Dark mode toggle

---

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

ISC

---

## Acknowledgments

- Built for Lake Macquarie Rowing Club
- Powered by RevolutioniseSport API
- TypeScript implementation by Claude Code

---

**Version:** 3.0.0 (Web Interface MVP)
**Last Updated:** October 2025
