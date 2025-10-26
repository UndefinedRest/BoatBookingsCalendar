# Boat Information Investigation Report

Investigation into what boat information is available from RevolutioniseSport for improving member boat identification.

**Date:** 2025-10-26
**Boat Examined:** 6283 - Euro single scull (Jono Hunter)
**Admin Portal URL:** https://portal.revolutionise.com.au/lmrc2019/assets/edit/5439

---

## Key Finding: Two Separate Systems

RevolutioniseSport uses **two separate domains** with different authentication:

1. **Booking System** (`www.lakemacquarierowingclub.org.au`)
   - Member-facing booking interface
   - Our current system authenticates here
   - Limited boat information available

2. **Admin Portal** (`portal.revolutionise.com.au`)
   - Club administration interface
   - Separate authentication required
   - Full boat details (photos, specs, notes, etc.)
   - **Cannot access from booking system credentials**

---

## Information Currently Available (Booking System)

### From `/bookings` List Page

**Raw HTML Structure:**
```html
<div class="card card-hover mt-4">
    <div class="p-4 d-flex align-items-center justify-content-between">
        <div class="mr-3">
            1X - Euro single scull ( Jono Hunter )
        </div>
        <div class="dropdown">
            <a href="/bookings/calendar/6283">Calendar</a>
            <a href="/bookings/6283">Book this item</a>
        </div>
    </div>
</div>
```

**Information Extracted:**
- ✅ **Boat ID**: 6283
- ✅ **Full Name**: "1X - Euro single scull ( Jono Hunter )"
- ✅ **Type**: 1X (parsed from prefix)
- ✅ **Display Name**: "Euro single scull" (parsed)
- ✅ **Nickname**: "Jono Hunter" (from parentheses)
- ✅ **Calendar URL**: `/bookings/calendar/6283`
- ✅ **Booking URL**: `/bookings/6283`

**NOT Available:**
- ❌ Boat photo/image
- ❌ Manufacturer details
- ❌ Serial number
- ❌ Weight specifications (except if in name like "70 KG")
- ❌ Boat description/notes
- ❌ Maintenance status
- ❌ Location in boat shed
- ❌ Special requirements

### From `/bookings/calendar/{id}` Page

**Information Available:**
- ✅ Dropdown with all boats (useful for navigation)
- ✅ Calendar view of bookings
- ✅ Same boat name as list page

**NOT Available:**
- ❌ Additional boat metadata
- ❌ Photos or specifications
- ❌ Just shows booking calendar

---

## Information We Parse from Boat Names

Our current parsing logic extracts:

### 1. Boat Type
- Pattern: `1X`, `2X`, `4X`, `8X`, `2-`, `4-`, `4+`, `8+`
- Example: "**1X** - Euro single scull (Jono Hunter)" → Type: `1X`

### 2. Classification
- **Racer**: Contains "RACER" keyword
- **RT**: Contains "RT" keyword
- **Training**: Default if neither above
- Example: "1X **RACER** - Swift Carbon Elite..." → Classification: `R`

### 3. Weight Class
- Pattern: Numbers followed by "KG"
- Example: "Wintech Single scull **85-105 KG** (HWT)" → Weight: `85-105`
- Missing if not in name (like Jono Hunter boat)

### 4. Nickname
- Pattern: Text in parentheses at end
- Example: "Euro single scull **(Jono Hunter)**" → Nickname: `Jono Hunter`
- Used for: Memorial boats, sponsorships, or friendly names

### 5. Manufacturer/Model
- Everything between type and parentheses
- Example: "1X - **Euro single scull** (Jono Hunter)" → Model: `Euro single scull`

---

## Current Data Structure

```json
{
  "id": "6283",
  "fullName": "1X - Euro single scull ( Jono Hunter )",
  "displayName": "Euro single scull",
  "nickname": "Jono Hunter",
  "type": "1X",
  "classification": "T",
  "weight": null,
  "calendarUrl": "/bookings/calendar/6283",
  "bookingUrl": "/bookings/6283",
  "bookings": [],
  "availability": {
    "availableSlots": 14,
    "totalSlots": 14,
    "utilizationPercent": 0
  }
}
```

---

## Examples from Other Boats

### Complete Information (from boat names):
```
"1X RACER - Swift Carbon Elite single scull 65 KG (Cockle Creek)"
→ Type: 1X
→ Classification: Racer
→ Weight: 65 KG
→ Manufacturer: Swift
→ Model: Carbon Elite single scull
→ Nickname: Cockle Creek
```

```
"4X - Ausrowtec coxed quad/four 90 KG Hunter"
→ Type: 4X
→ Classification: Training
→ Weight: 90 KG
→ Manufacturer: Ausrowtec
→ Model: coxed quad/four
→ Nickname: Hunter
```

### Minimal Information:
```
"1X - Euro single scull ( Jono Hunter )"
→ Type: 1X
→ Classification: Training
→ Weight: (none specified)
→ Manufacturer: Euro
→ Model: single scull
→ Nickname: Jono Hunter
```

---

## Recommendations for Better Boat Identification

### Option 1: Enhance Boat Name Standards (No Code Changes)

Encourage consistent naming format with all key info:
```
{TYPE} {CLASSIFICATION} - {MANUFACTURER} {MODEL} {WEIGHT} ({NICKNAME})

Examples:
1X RACER - Euro Elite single scull 70 KG (Jono Hunter)
2X RT - Swift Club double scull 70 KG (Ian Krix)
4X - Ausrowtec coxed quad 90 KG (Hunter Heron)
```

**Pros:**
- ✅ No code changes needed
- ✅ Works immediately
- ✅ Club controls all data

**Cons:**
- ❌ Requires manual rename of all boats in admin portal
- ❌ Long boat names might be hard to read

---

### Option 2: Add Boat Details Lookup Table (Moderate Effort)

Create a local configuration file with additional boat details:

**`src/config/boat-details.ts`:**
```typescript
export const boatDetails = {
  "6283": {
    manufacturer: "Euro",
    model: "Elite Single Scull",
    weight: "70-75 KG",
    color: "Yellow/Blue",
    location: "Shed A, Rack 3",
    description: "Lightweight single scull, ideal for intermediate rowers",
    imageUrl: "/assets/boats/jono-hunter.jpg", // if we host images
    notes: "Check rigger before use"
  },
  "6289": {
    manufacturer: "Rowbest",
    model: "Club Single",
    weight: "75-85 KG",
    // ...
  }
  // ... more boats
};
```

**Usage in Web UI:**
```typescript
const boat = getBoatWithDetails(rawBoat);
// boat.details.color → "Yellow/Blue"
// boat.details.description → "Lightweight single scull..."
```

**Pros:**
- ✅ Full control over displayed information
- ✅ Can add photos (if hosted locally or on CDN)
- ✅ Rich descriptions and guidance
- ✅ Easy to update without touching RevSport

**Cons:**
- ❌ Manual data entry for all boats
- ❌ Duplicate data (exists in admin portal too)
- ❌ Needs maintenance when boats change

---

### Option 3: Enhanced Parsing + Visual Aids (Low Effort)

Improve UI to make existing data more helpful:

#### A. Add Visual Boat Type Icons
```
🚣 = 1X (Single)
🚣🚣 = 2X (Double)
🚣🚣🚣🚣 = 4X (Quad)
🚣🚣🚣🚣🚣🚣🚣🚣 = 8X (Eight)
```

#### B. Color-Code Classifications
```css
.boat-racer { background: #ff6b6b; }  /* Red for racing boats */
.boat-rt { background: #ffd93d; }     /* Yellow for RT boats */
.boat-training { background: #6bcf7f; } /* Green for training */
```

#### C. Show Weight Class Prominently
```
Euro single scull
Jono Hunter
🏋️ 70-75 KG  |  🚣 1X  |  📈 Training
```

#### D. Add Tooltips on Hover
```html
<div class="boat-card" title="Euro single scull - Training boat suitable for 70-75kg rowers. Located in Shed A, Rack 3">
  ...
</div>
```

**Pros:**
- ✅ Uses existing data
- ✅ Low effort to implement
- ✅ Immediate visual improvement
- ✅ No data entry required

**Cons:**
- ❌ Limited to what's in boat names
- ❌ No photos

---

### Option 4: Admin Portal Integration (High Effort, Full Features)

Attempt to access admin portal data:

**Challenges:**
1. **Different domain**: `portal.revolutionise.com.au` vs `www.lakemacquarierowingclub.org.au`
2. **Separate authentication**: Would need admin credentials
3. **API discovery**: Need to reverse-engineer admin portal APIs
4. **Permissions**: Member credentials may not have admin access

**Potential Approach:**
```typescript
// Would require:
// 1. Admin portal credentials
// 2. Separate authentication flow
// 3. Finding asset details API endpoint

const adminAuth = new AdminPortalAuth(adminCredentials);
await adminAuth.login();
const assetDetails = await adminAuth.get(`/api/assets/${boatId}`);
// Would return: photos, specs, maintenance records, etc.
```

**Pros:**
- ✅ Access to all boat information (photos, full specs, etc.)
- ✅ Single source of truth
- ✅ Auto-updates when admin portal changes

**Cons:**
- ❌ Requires admin credentials (security concern)
- ❌ API might not be documented/stable
- ❌ High development effort
- ❌ May violate terms of service

---

## Recommended Approach: Hybrid

**Phase 1 (Immediate):** Option 3 - Enhanced Parsing + Visual Aids
- Add boat type icons
- Color-code classifications
- Better display of weight classes
- **Effort:** 1-2 hours
- **Value:** Immediate improvement

**Phase 2 (Short-term):** Option 2 - Boat Details Lookup
- Create `boat-details.ts` configuration
- Add descriptions and guidance for top 10-15 most-used boats
- Host boat photos locally or on club website
- **Effort:** 2-4 hours + photo collection
- **Value:** Significantly better member experience

**Phase 3 (Future):** Standardize Boat Names
- Work with club admin to standardize boat naming in admin portal
- Ensure consistent format with all key information
- **Effort:** Admin time only
- **Value:** Long-term consistency

---

## Quick Wins for Today

### 1. Display Improvements (1 hour)

Add to `public/css/styles.css`:
```css
/* Boat type badges */
.boat-type {
  background: #1e40af;
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 600;
}

/* Classification colors */
.boat-racer { border-left: 4px solid #dc2626; }
.boat-rt { border-left: 4px solid #f59e0b; }
.boat-training { border-left: 4px solid #10b981; }

/* Weight class indicator */
.boat-weight {
  color: #64748b;
  font-size: 0.875rem;
}
```

Add to `frontend/src/app.ts`:
```typescript
private renderBoatName(boat): string {
  const typeBadge = `<span class="boat-type">${boat.type}</span>`;
  const weightInfo = boat.weight ?
    `<span class="boat-weight">⚖️ ${boat.weight} KG</span>` :
    '';
  const nickname = boat.nickname ?
    `<span class="boat-nickname">${boat.nickname}</span>` :
    '';

  return `
    <div class="boat-name-container">
      ${typeBadge}
      <strong>${boat.displayName}</strong>
      ${nickname}
      ${weightInfo}
    </div>
  `;
}
```

### 2. Add Tooltips (30 minutes)

```typescript
private getBoatTooltip(boat): string {
  return `
    ${boat.displayName}${boat.nickname ? ' (' + boat.nickname + ')' : ''}
    Type: ${boat.type}
    Class: ${boat.classification === 'R' ? 'Racing' : boat.classification === 'RT' ? 'RT' : 'Training'}
    ${boat.weight ? 'Weight: ' + boat.weight + ' KG' : ''}
  `.trim();
}
```

### 3. Group by Weight (if useful)

Within each boat type, could sub-group by weight:
```
SINGLES
  Lightweight (< 70 KG)
    - Swift Carbon Elite 65 KG (Cockle Creek)
    - Swift Carbon Elite 65 KG (Marmong)

  Heavyweight (> 75 KG)
    - Wintech Single 85-105 KG (HWT)
    - Euro single scull (Jono Hunter)
```

---

## Sample Enhanced Display

**Current:**
```
Euro single scull
  [empty] [empty] [empty] [empty] [empty] [empty] [empty]
```

**Enhanced Option 1 (Visual Only):**
```
🚣 1X  Euro single scull  (Jono Hunter)  🟢 Training
  [empty] [empty] [empty] [empty] [empty] [empty] [empty]
```

**Enhanced Option 2 (With Details Config):**
```
🚣 Euro single scull (Jono Hunter)
📍 Shed A, Rack 3  |  ⚖️ 70-75 KG  |  🟢 Training
💡 Lightweight single, ideal for intermediate rowers
  [empty] [empty] [empty] [empty] [empty] [empty] [empty]
```

---

## Conclusion

**What we CAN quickly capture:**
- ✅ All information embedded in boat names
- ✅ Type, classification, weight (if specified)
- ✅ Manufacturer, model, nickname
- ✅ Booking availability

**What we CANNOT easily access:**
- ❌ Boat photos from admin portal
- ❌ Detailed specifications not in name
- ❌ Maintenance records
- ❌ Location in shed

**Best Path Forward:**
1. Enhance visual presentation of existing data (quick win)
2. Add local boat details config for key boats (medium effort, high value)
3. Work with admin to standardize boat names (long-term consistency)

---

**Files Generated:**
- `boat-bookings-page.html` - Full booking list page HTML
- `boat-calendar-page.html` - Calendar page HTML for boat 6283
- `investigate-boat-info.js` - Investigation script (can run anytime)
