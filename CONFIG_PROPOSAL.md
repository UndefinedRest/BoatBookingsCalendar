# TV Display Configuration Page - Proposal

## Overview
This proposal outlines a web-based configuration interface for the LMRC Booking TV Display, similar to the Noticeboard project. The goal is to allow non-technical users to customize the display appearance and behavior without editing files or restarting the server.

---

## Current Configuration State

### ✅ Currently Configurable via .env File
| Setting | Current Method | Location |
|---------|---------------|----------|
| Server Port | `PORT` env var | `.env` |
| Cache TTL | `CACHE_TTL` env var | `.env` |
| Refresh Interval | `REFRESH_INTERVAL` env var | `.env` |
| RevSport Credentials | `REVSPORT_*` env vars | `.env` |
| Session Times | `SESSION_*_START/END` env vars | `.env` |
| Club Name | `CLUB_NAME` env var | `.env` |
| Club Colors | `CLUB_PRIMARY_COLOR`, `CLUB_SECONDARY_COLOR` | `.env` |
| Debug Mode | `REVSPORT_DEBUG` env var | `.env` |

### ✅ Currently Configurable via CSS Variables
| Setting | Location | Value |
|---------|----------|-------|
| Boat Type Colors | `tv-display.css:26-29` | `--boat-type-1x-bg`, etc. |
| Typography Sizes | `tv-display.css:36-41` | Font size variables |
| Layout Dimensions | `tv-display.css:53-55` | Row heights, widths |
| Days to Display | `tv-display.css:58` | `--days-to-display: 5` |
| Separator Styling | `tv-display.css:32-33` | Color and width |

### ❌ Currently Hardcoded (Should be Configurable)
| Item | Current Location | Current Value |
|------|-----------------|---------------|
| Column Titles | `tv.html:31,42` | "CLUB BOATS", "RACE BOATS" |
| Today Label | `tv-display.js:186` | "TODAY" |
| Footer Club Name | `tv.html:60` | Hardcoded in HTML |
| Auto-refresh Label | `tv.html:64` | "Auto-refresh: 10 min" |
| Alternating Row Colors | `tv-display.css:222-228` | `#fafafa`, `#ffffff` |
| Border Colors | Multiple CSS locations | Various |
| Type Order Priority | `tv-display.js:223` | `{'4X': 1, '2X': 2, '1X': 3}` |
| Boat Type Badge Colors | `tv-display.css:266-274` | Blue badge |
| Unknown Boat Filtering | `tv-display.js:209` | Hardcoded filter |
| Day Header Format | `tv-display.js:189` | "WED 28" format |

---

## Proposed Configuration Page Structure

### 1. **Display Settings** (High Priority)

#### 1.1 Layout
- **Days to Display** (number, 1-7)
  - Current: 5 days
  - Description: "Number of days to show on the TV display (including today)"
  - Validation: Min 1, Max 7

- **Boat Row Height** (pixels)
  - Current: 60px
  - Description: "Height of each boat row (increase for better spacing)"
  - Validation: Min 40px, Max 120px

- **Session Row Height** (pixels)
  - Current: 30px
  - Description: "Height of each session within a boat row"
  - Validation: Min 20px, Max 60px

- **Boat Name Width** (pixels)
  - Current: 360px
  - Description: "Width of the boat name column"
  - Validation: Min 250px, Max 500px

#### 1.2 Typography
- **Boat Name Font Size** (pixels)
  - Current: 26px
  - Description: "Font size for boat names"
  - Validation: Min 16px, Max 40px

- **Booking Details Font Size** (pixels)
  - Current: 22px
  - Description: "Font size for booking times and member names"
  - Validation: Min 14px, Max 32px

- **Column Title Font Size** (pixels)
  - Current: 32px
  - Description: "Font size for 'CLUB BOATS' and 'RACE BOATS' headers"
  - Validation: Min 20px, Max 48px

#### 1.3 Column Configuration
- **Left Column Title** (text)
  - Current: "CLUB BOATS"
  - Description: "Title for the left column"
  - Validation: Max 50 characters

- **Right Column Title** (text)
  - Current: "RACE BOATS"
  - Description: "Title for the right column"
  - Validation: Max 50 characters

### 2. **Color Settings** (High Priority)

#### 2.1 Boat Type Colors (Boat Name Column Only)
- **Singles (1X) Background** (color picker)
  - Current: `#fffbeb` (very subtle yellow)
  - Description: "Background color for single scull boat names"

- **Doubles (2X) Background** (color picker)
  - Current: `#eff6ff` (very subtle blue)
  - Description: "Background color for double scull boat names"

- **Quads (4X) Background** (color picker)
  - Current: `#f0fdf4` (very subtle green)
  - Description: "Background color for quad scull boat names"

- **Other Boats Background** (color picker)
  - Current: `#fafafa` (very subtle gray)
  - Description: "Background color for other boat types"

#### 2.2 Row Colors (Booking Data Columns)
- **Even Row Background** (color picker)
  - Current: `#fafafa` (light gray)
  - Description: "Background color for even-numbered boat rows"

- **Odd Row Background** (color picker)
  - Current: `#ffffff` (white)
  - Description: "Background color for odd-numbered boat rows"

#### 2.3 Other Colors
- **Boat Type Badge Background** (color picker)
  - Current: `#0ea5e9` (blue)
  - Description: "Background color for boat type badges (1X, 2X, 4X)"

- **Column Header Background** (color picker)
  - Current: `#1e40af` (navy blue)
  - Description: "Background color for column headers"

- **Booking Time Text Color** (color picker)
  - Current: `#dc2626` (red)
  - Description: "Color for booking time text"

- **Type Separator Color** (color picker)
  - Current: `#64748b` (dark gray)
  - Description: "Color for separator lines between boat type groups"

### 3. **Boat Type Grouping** (Medium Priority)

#### 3.1 Type Patterns
- **Singles Patterns** (multi-select tags)
  - Current: `['1X']`
  - Description: "Boat type codes that should be grouped as singles"
  - Allow adding custom patterns

- **Doubles Patterns** (multi-select tags)
  - Current: `['2X', '2-']`
  - Description: "Boat type codes that should be grouped as doubles"

- **Quads Patterns** (multi-select tags)
  - Current: `['4X', '4+', '4-', '8X', '8+']`
  - Description: "Boat type codes that should be grouped as quads"

#### 3.2 Sorting
- **Type Display Order** (drag-and-drop list)
  - Current: 4X → 2X → 1X → Other
  - Description: "Order in which boat types appear in each column"

- **Hide Unknown Boat Types** (checkbox)
  - Current: true
  - Description: "Hide boats with unrecognized types from the display"

### 4. **Text & Labels** (Medium Priority)

#### 4.1 Display Text
- **Today Label** (text)
  - Current: "TODAY"
  - Description: "Label shown for today's date column"
  - Validation: Max 20 characters

- **Last Updated Prefix** (text)
  - Current: "Last updated:"
  - Description: "Text shown before the last update time"

- **Auto-refresh Label Format** (text with placeholder)
  - Current: "Auto-refresh: {minutes} min"
  - Description: "Text for auto-refresh indicator. Use {minutes} for value"

#### 4.2 Date & Time Formats
- **Day Header Format** (dropdown)
  - Current: "WED 28" (short weekday + day number)
  - Options:
    - "WED 28" (short weekday + day)
    - "Wednesday 28" (full weekday + day)
    - "28 Oct" (day + short month)
    - "28/10" (day/month)

- **Footer Date Format** (dropdown)
  - Current: "TODAY - Saturday 26 October"
  - Options:
    - "Long" (Saturday 26 October)
    - "Medium" (Sat 26 Oct)
    - "Short" (26/10/2025)

### 5. **Refresh & Timing** (Low Priority)

- **Auto-refresh Interval** (minutes)
  - Current: 5 minutes (300000ms)
  - Description: "How often to refresh booking data"
  - Validation: Min 1 min, Max 60 min

- **Error Retry Delay** (seconds)
  - Current: 30 seconds
  - Description: "How long to wait before retrying after an error"
  - Validation: Min 5s, Max 300s

### 6. **Club Branding** (Already in .env, but should be in UI)

- **Club Name** (text)
  - Current: "Lake Macquarie Rowing Club"
  - Used in: Footer

- **Club Short Name** (text)
  - Current: "LMRC"
  - Used in: Page title

- **Primary Color** (color picker)
  - Current: `#1e40af`
  - Description: "Main brand color"

- **Secondary Color** (color picker)
  - Current: `#0ea5e9`
  - Description: "Secondary brand color"

- **Logo URL** (text/upload)
  - Current: "/images/lmrc-logo.png"
  - Description: "Club logo shown in footer"

---

## Implementation Approach

### Phase 1: Backend Storage & API
1. **Configuration Storage**
   - Create `config/tv-display.json` file for storing user preferences
   - Keep .env for credentials/server settings (security)
   - Merge .env values with JSON config at runtime

2. **New API Endpoints**
   ```
   GET  /api/v1/config/tv-display    - Get current TV display config
   POST /api/v1/config/tv-display    - Update TV display config
   GET  /api/v1/config/defaults      - Get default configuration
   POST /api/v1/config/reset         - Reset to defaults
   ```

3. **Configuration Schema** (TypeScript interface + Zod validation)
   - Create comprehensive interface for all settings
   - Add validation for all user inputs
   - Provide sensible defaults

### Phase 2: Configuration UI Page
1. **New Route**: `/config` or `/admin/config`

2. **UI Components**
   - **Tabbed Interface** (similar to Noticeboard)
     - Tab 1: Display Settings
     - Tab 2: Colors
     - Tab 3: Boat Types
     - Tab 4: Text & Labels
     - Tab 5: Club Branding

   - **Form Controls**
     - Color pickers (use HTML5 color input or library like Pickr)
     - Range sliders with numeric input
     - Text inputs with validation
     - Checkboxes and toggles
     - Drag-and-drop list for sorting
     - Tag inputs for pattern arrays

   - **Preview Section**
     - Live preview pane showing changes in real-time (optional)
     - Or "Preview on TV" button that applies temporarily

   - **Action Buttons**
     - Save Changes (persists to JSON)
     - Reset to Defaults
     - Cancel/Revert

3. **Security**
   - Basic authentication/password protection
   - Optional: Token-based auth
   - CORS protection

### Phase 3: Frontend Integration
1. **CSS Variable Updates**
   - JavaScript reads config from API
   - Dynamically sets CSS custom properties using `document.documentElement.style.setProperty()`

2. **Template Updates**
   - Replace hardcoded strings with config values
   - Update sorting logic to use config

3. **Hot Reload**
   - TV display polls `/api/v1/config/tv-display` periodically
   - Compares hash/version to detect changes
   - Applies new config without page reload (for CSS vars)
   - Full reload if structural changes detected

---

## Configuration File Structure

```typescript
interface TVDisplayConfig {
  version: number; // For cache invalidation
  lastModified: string; // ISO timestamp

  layout: {
    daysToDisplay: number;
    boatRowHeight: number;
    sessionRowHeight: number;
    boatNameWidth: number;
  };

  typography: {
    boatNameSize: number;
    bookingDetailsSize: number;
    columnTitleSize: number;
  };

  columns: {
    leftTitle: string;
    rightTitle: string;
  };

  colors: {
    boatTypes: {
      singles: string;
      doubles: string;
      quads: string;
      other: string;
    };
    rows: {
      even: string;
      odd: string;
    };
    ui: {
      boatTypeBadge: string;
      columnHeader: string;
      bookingTime: string;
      typeSeparator: string;
    };
  };

  boatTypes: {
    patterns: {
      singles: string[];
      doubles: string[];
      quads: string[];
    };
    sortOrder: string[]; // e.g., ['4X', '2X', '1X', 'Other']
    hideUnknown: boolean;
  };

  text: {
    todayLabel: string;
    lastUpdatedPrefix: string;
    autoRefreshFormat: string; // e.g., "Auto-refresh: {minutes} min"
  };

  formats: {
    dayHeader: 'SHORT_WEEKDAY_DAY' | 'FULL_WEEKDAY_DAY' | 'DAY_MONTH' | 'DAY_SLASH_MONTH';
    footerDate: 'LONG' | 'MEDIUM' | 'SHORT';
  };

  timing: {
    refreshInterval: number; // milliseconds
    errorRetryDelay: number; // milliseconds
  };
}
```

---

## User Flow

1. **Access Config Page**
   - Navigate to `/config` in browser
   - Authenticate (if required)

2. **Make Changes**
   - Select tab (e.g., "Colors")
   - Adjust settings using intuitive controls
   - See validation feedback in real-time

3. **Preview (Optional)**
   - Click "Preview on TV" button
   - Changes applied temporarily to TV display
   - Doesn't save until "Save Changes" clicked

4. **Save**
   - Click "Save Changes"
   - Config written to `config/tv-display.json`
   - All connected TV displays update automatically (within refresh interval)

5. **Reset if Needed**
   - Click "Reset to Defaults"
   - Confirmation dialog
   - Reverts to factory defaults

---

## Technical Considerations

### Backwards Compatibility
- Existing .env values should still work
- JSON config takes precedence over .env defaults
- Graceful degradation if config file missing

### Performance
- Config changes don't require server restart
- TV display polls for changes every 30-60 seconds
- Use ETags or version numbers to avoid unnecessary updates

### Validation
- Server-side validation using Zod
- Client-side validation for better UX
- Sensible min/max ranges to prevent broken displays

### Error Handling
- If config file corrupted, fall back to defaults
- Log errors but don't crash server
- Show validation errors clearly in UI

---

## Priority Recommendations

### Must Have (MVP)
- Colors (boat types, rows, UI elements)
- Typography sizes
- Column titles
- Days to display
- Refresh interval

### Should Have
- Boat type patterns and sorting
- Text labels customization
- Date/time formats
- Layout dimensions

### Nice to Have
- Live preview
- Import/export config
- Multiple saved presets
- Theme templates

---

## Questions for Review

1. **Authentication**: Do you want password protection on the config page? If so, simple password or user accounts?

2. **Preview**: Is live preview essential, or acceptable to refresh TV manually to see changes?

3. **Hosting**: Will config page be accessible from same server, or separate admin interface?

4. **Mobile**: Should config page be mobile-friendly for tablets/phones?

5. **Multi-Display**: Do you plan to have multiple TV displays with different configs, or one global config?

6. **Advanced Features**: Interest in scheduled config changes (e.g., different colors for summer/winter)?

---

## Next Steps

1. **Review & Feedback**: Review this proposal and provide feedback
2. **Prioritize Features**: Identify must-have vs nice-to-have features
3. **Design UI Mockup**: Create wireframe/mockup of config page
4. **Implement Backend**: Create API endpoints and config storage
5. **Implement Frontend**: Build config UI
6. **Testing**: Test on Raspberry Pi with TV display
7. **Documentation**: Update README with config page usage
