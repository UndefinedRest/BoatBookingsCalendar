# TV Display Configuration Guide

## Overview

The LMRC Booking System now includes a web-based configuration page that allows you to customize the TV display appearance without editing code or restarting the server.

## Accessing the Configuration Page

1. Open a web browser on your Raspberry Pi (or any device on the same network)
2. Navigate to: `http://localhost:3000/config.html`
3. If accessing from another device: `http://<raspberry-pi-ip>:3000/config.html`

## Configuration Options

### Layout Settings

- **Days to Display** (1-7): Number of days to show on the TV display (including today)
- **Boat Row Height** (40-120px): Height of each boat row
- **Session Row Height** (20-60px): Height of each session within a boat row
- **Boat Name Column Width** (250-500px): Width of the boat name column

### Typography

- **Boat Name Font Size** (16-40px): Font size for boat names
- **Booking Details Font Size** (14-32px): Font size for booking times and member names
- **Column Title Font Size** (20-48px): Font size for column headers

### Column Titles

- **Left Column Title**: Text for the left column (default: "CLUB BOATS")
- **Right Column Title**: Text for the right column (default: "RACE BOATS")

### Boat Type Colors

Background colors for boat name column (by boat type):
- **Singles (1X)**: Default: `#fffbeb` (very subtle yellow)
- **Doubles (2X)**: Default: `#eff6ff` (very subtle blue)
- **Quads (4X)**: Default: `#f0fdf4` (very subtle green)
- **Other Boats**: Default: `#fafafa` (very subtle gray)

### Row Colors

Alternating row background colors for booking data columns:
- **Even Rows**: Default: `#fafafa` (light gray)
- **Odd Rows**: Default: `#ffffff` (white)

### UI Colors

- **Boat Type Badge**: Badge color for boat type labels (1X, 2X, 4X)
- **Column Header**: Background color for column headers
- **Booking Time Text**: Color for booking time text
- **Type Separator Line**: Color for separator lines between boat type groups

### Refresh Settings

- **Auto-refresh Interval** (1-60 minutes): How often to refresh booking data from the server

## Making Changes

1. Adjust any settings using the form controls:
   - **Sliders**: Drag to adjust values, or type directly in the number box
   - **Color Pickers**: Click to open color picker, or type hex color codes
   - **Text Inputs**: Type custom text for column titles

2. Click **"Save Configuration"** to apply changes
   - Changes are saved to `config/tv-display.json` on the Raspberry Pi
   - The TV display will automatically detect and apply changes within 30 seconds
   - No server restart required!

3. Click **"Reset to Defaults"** to restore factory settings
   - Confirmation dialog will appear
   - All settings return to original values

4. Click **"View TV Display"** to see your TV display

## How Changes Are Applied

- **Immediate**: Changes to colors, fonts, and layout are applied without page reload
- **Automatic**: The TV display checks for configuration changes every 30 seconds
- **Local**: Each Raspberry Pi stores its own configuration independently

## Configuration File

Configuration is stored in: `config/tv-display.json`

Example structure:
```json
{
  "version": 2,
  "layout": {
    "daysToDisplay": 5,
    "boatRowHeight": 60,
    "sessionRowHeight": 30,
    "boatNameWidth": 360
  },
  "typography": {
    "boatNameSize": 26,
    "bookingDetailsSize": 22,
    "columnTitleSize": 32
  },
  "columns": {
    "leftTitle": "CLUB BOATS",
    "rightTitle": "RACE BOATS"
  },
  "colors": {
    "boatTypes": {
      "singles": "#fffbeb",
      "doubles": "#eff6ff",
      "quads": "#f0fdf4",
      "other": "#fafafa"
    },
    "rows": {
      "even": "#fafafa",
      "odd": "#ffffff"
    },
    "ui": {
      "boatTypeBadge": "#0ea5e9",
      "columnHeader": "#1e40af",
      "bookingTime": "#dc2626",
      "typeSeparator": "#64748b"
    }
  },
  "timing": {
    "refreshInterval": 300000
  },
  "lastModified": "2025-10-27T05:56:56.949Z"
}
```

## Tips for Best Results

### Font Sizes
- For 55" TVs at 2m viewing distance, default sizes (26px boat names, 22px bookings) work well
- For larger screens or further viewing distances, increase font sizes by 2-4px
- For smaller screens or closer viewing, decrease by 2-4px

### Colors
- Use subtle colors (very light shades) for boat type backgrounds
- Ensure good contrast between text and backgrounds
- Test colors on the actual TV before finalizing
- Darker colors can cause eye strain on large displays

### Layout
- Default 5 days works well for most screens
- Increase row heights if text feels cramped
- Decrease boat name width if you need more space for bookings
- Consider screen resolution when adjusting dimensions

### Refresh Interval
- 5 minutes (default) balances freshness with server load
- Increase to 10-15 minutes if bookings don't change frequently
- Decrease to 2-3 minutes for busier booking periods

## Troubleshooting

### Changes Not Appearing
- Wait 30 seconds for automatic config check
- Hard refresh the TV display page (Ctrl+Shift+R)
- Check browser console for errors (F12)

### Colors Look Wrong
- Ensure hex color codes start with `#` and have exactly 6 characters
- Use color picker for accurate color selection
- Check that colors have sufficient contrast

### Config Page Won't Load
- Verify server is running: `npm start`
- Check firewall isn't blocking port 3000
- Try accessing from the Pi itself: `http://localhost:3000/config.html`

### Reset Didn't Work
- Check that config file has write permissions
- Verify no syntax errors in manual edits
- Delete `config/tv-display.json` and restart server to regenerate

## API Endpoints

For advanced users or automation:

- **GET** `/api/v1/config/tv-display` - Get current configuration
- **POST** `/api/v1/config/tv-display` - Update configuration (JSON body)
- **POST** `/api/v1/config/tv-display/reset` - Reset to defaults

Example cURL command:
```bash
# Get current config
curl http://localhost:3000/api/v1/config/tv-display

# Reset to defaults
curl -X POST http://localhost:3000/api/v1/config/tv-display/reset
```

## Deployment Notes

When deploying to Raspberry Pi:

1. Pull latest code: `git pull origin main`
2. Install dependencies: `npm install`
3. Build project: `npm run build`
4. Start server: `npm start`
5. Access config page in browser
6. Configure as needed
7. Configuration persists across restarts

The `config/tv-display.json` file is **not** tracked in Git, so each Raspberry Pi can maintain its own unique configuration.
