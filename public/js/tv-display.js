/**
 * TV Display Controller - Two Column Layout
 * Shows ALL boats split into Club (left) and Race (right) columns
 */

class TVDisplayController {
  constructor() {
    // Try to read refresh interval from CSS variable, default to 5 minutes
    const root = document.documentElement;
    const refreshIntervalStr = getComputedStyle(root).getPropertyValue('--refresh-interval').trim();
    this.refreshInterval = refreshIntervalStr ? parseInt(refreshIntervalStr) : 300000; // 5 minutes default

    this.clockInterval = 1000; // 1 second
    this.retryDelay = 30000; // 30 seconds on error

    this.elements = {
      loadingScreen: document.getElementById('loadingScreen'),
      errorScreen: document.getElementById('errorScreen'),
      errorMessage: document.getElementById('errorMessage'),
      mainView: document.getElementById('mainView'),
      clubBoatsList: document.getElementById('clubBoatsList'),
      raceBoatsList: document.getElementById('raceBoatsList'),
      clubDayHeaders: document.getElementById('clubDayHeaders'),
      raceDayHeaders: document.getElementById('raceDayHeaders'),
      todayDateFooter: document.getElementById('todayDateFooter'),
      lastUpdated: document.getElementById('lastUpdated'),
    };

    this.bookingData = null;
    this.config = null;
    this.daysToDisplay = 5; // Read from CSS variable or default to 5
    this.refreshTimer = null; // Store timer reference for proper cleanup
  }

  /**
   * Initialize and start the display
   */
  async init() {
    console.log('[TV Display] Initializing...');
    console.log(`[TV Display] Refresh interval: ${this.refreshInterval / 1000}s`);

    // Start clock immediately
    this.updateClock();
    setInterval(() => this.updateClock(), this.clockInterval);

    // Load initial data
    await this.loadData();

    // Schedule periodic refresh - store reference
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
    this.refreshTimer = setInterval(() => {
      console.log('[TV Display] Auto-refresh triggered');
      this.loadData();
    }, this.refreshInterval);
  }

  /**
   * Load booking data and configuration from API
   */
  async loadData() {
    try {
      console.log('[TV Display] Fetching booking data...');

      // Fetch both bookings and config in parallel
      const [bookingsResponse, configResponse] = await Promise.all([
        fetch('/api/v1/bookings'),
        fetch('/api/v1/config')
      ]);

      if (!bookingsResponse.ok || !configResponse.ok) {
        throw new Error('Failed to fetch data from server');
      }

      const bookingsResult = await bookingsResponse.json();
      const configResult = await configResponse.json();

      if (!bookingsResult.success || !configResult.success) {
        throw new Error('API returned error status');
      }

      this.bookingData = bookingsResult.data;
      this.config = configResult.data;

      console.log('[TV Display] Data loaded successfully', {
        totalBoats: this.bookingData.metadata.totalBoats,
        totalBookings: this.bookingData.metadata.totalBookings
      });

      // Render the display
      this.render();

      // Hide error/loading, show main view
      this.showView('main');

      // Update last updated timestamp
      this.updateLastUpdated();

    } catch (error) {
      console.error('[TV Display] Error loading data:', error);
      this.showError(error.message);

      // Retry after delay
      setTimeout(() => this.loadData(), this.retryDelay);
    }
  }

  /**
   * Render the two-column boat display
   */
  render() {
    if (!this.bookingData) return;

    // Generate day headers for both columns
    this.renderDayHeaders();

    // Split boats into Club and Race
    const { clubBoats, raceBoats } = this.splitBoatsByClassification();

    console.log('[TV Display] Rendering boats:', {
      club: clubBoats.length,
      race: raceBoats.length,
      daysToDisplay: this.daysToDisplay
    });

    // Render club boats (left column)
    this.elements.clubBoatsList.innerHTML = '';
    clubBoats.forEach(boat => {
      const entry = this.createBoatEntry(boat);
      this.elements.clubBoatsList.appendChild(entry);
    });

    // Render race boats (right column)
    this.elements.raceBoatsList.innerHTML = '';
    raceBoats.forEach(boat => {
      const entry = this.createBoatEntry(boat);
      this.elements.raceBoatsList.appendChild(entry);
    });
  }

  /**
   * Render day headers for multi-day view
   */
  renderDayHeaders() {
    const headers = this.generateDayHeaders();

    // Render for club column
    this.elements.clubDayHeaders.innerHTML = '';
    headers.forEach(header => {
      this.elements.clubDayHeaders.appendChild(header.cloneNode(true));
    });

    // Render for race column
    this.elements.raceDayHeaders.innerHTML = '';
    headers.forEach(header => {
      this.elements.raceDayHeaders.appendChild(header.cloneNode(true));
    });
  }

  /**
   * Generate day header elements
   */
  generateDayHeaders() {
    const headers = [];

    // Add spacer for boat name column
    const boatSpacer = document.createElement('div');
    boatSpacer.className = 'day-header-spacer';
    headers.push(boatSpacer);

    // Add headers for each day
    const today = new Date();
    for (let i = 0; i < this.daysToDisplay; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      const header = document.createElement('div');
      header.className = 'day-header';

      if (i === 0) {
        header.textContent = 'TODAY';
      } else {
        // Format: "WED 28"
        const dayName = date.toLocaleDateString('en-AU', { weekday: 'short' }).toUpperCase();
        const dayNum = date.getDate();
        header.textContent = `${dayName} ${dayNum}`;
      }

      headers.push(header);
    }

    return headers;
  }

  /**
   * Split boats by classification (Club vs Race) and group by type
   */
  splitBoatsByClassification() {
    const clubBoats = [];
    const raceBoats = [];

    this.bookingData.boats.forEach(boat => {
      // Filter out boats with Unknown type
      if (boat.type === 'Unknown') {
        return;
      }

      // Race boats: classification = 'R' (Racer)
      // Club boats: classification = 'T' (Training) or 'RT'
      if (boat.classification === 'R') {
        raceBoats.push(boat);
      } else {
        clubBoats.push(boat);
      }
    });

    // Sort by type (4X, 2X, 1X), then by nickname within type
    const typeOrder = { '4X': 1, '2X': 2, '1X': 3 };
    const getBoatName = (boat) => boat.nickname || boat.displayName;

    const sortBoats = (a, b) => {
      // Sort by type first
      const typeA = typeOrder[a.type] || 999;
      const typeB = typeOrder[b.type] || 999;
      if (typeA !== typeB) {
        return typeA - typeB;
      }
      // Then by name within same type
      return getBoatName(a).localeCompare(getBoatName(b));
    };

    clubBoats.sort(sortBoats);
    raceBoats.sort(sortBoats);

    return { clubBoats, raceBoats };
  }

  /**
   * Create a boat entry element (boat info on left, multi-day grid on right)
   */
  createBoatEntry(boat) {
    const entry = document.createElement('div');
    entry.className = 'boat-entry';

    // Use nickname if available, otherwise display name
    const boatName = boat.nickname || boat.displayName;

    // Build boat info HTML with weight if available
    let boatInfoHTML = `
      <span class="boat-type-badge">${boat.type}</span>
      <span class="boat-name-text" title="${this.escapeHtml(boatName)}">${this.escapeHtml(boatName)}</span>
    `;

    // Add weight badge if weight is available
    if (boat.weight && boat.weight !== 'null') {
      boatInfoHTML += `<span class="boat-weight">${boat.weight}kg</span>`;
    }

    // Boat info (type badge + name + weight) on left - fixed width
    const boatInfo = document.createElement('div');
    boatInfo.className = 'boat-info';
    boatInfo.innerHTML = boatInfoHTML;
    entry.appendChild(boatInfo);

    // Multi-day grid on right
    const daysGrid = document.createElement('div');
    daysGrid.className = 'boat-days-grid';

    // Create columns for each day
    const today = new Date();
    for (let i = 0; i < this.daysToDisplay; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = this.formatDate(date);

      const dayColumn = document.createElement('div');
      dayColumn.className = 'day-column';

      // Get bookings for this day, checking for spanning bookings
      const bookings = this.getBookingsForDate(boat, dateStr);

      // AM1 session for this day
      const am1 = this.createSessionItem(bookings.morning1);
      dayColumn.appendChild(am1);

      // AM2 session for this day
      const am2 = this.createSessionItem(bookings.morning2);
      dayColumn.appendChild(am2);

      daysGrid.appendChild(dayColumn);
    }

    entry.appendChild(daysGrid);

    return entry;
  }

  /**
   * Create a session item - without label
   */
  createSessionItem(booking) {
    const item = document.createElement('div');
    item.className = 'session-item';

    if (booking) {
      // Show booking: start time + member name (no label)
      item.innerHTML = `
        <span class="booking-time">${booking.startTime}</span>
        <span class="booking-member">${this.escapeHtml(booking.memberName)}</span>
      `;
    } else {
      // Leave blank when available
      item.innerHTML = '';
    }

    return item;
  }

  /**
   * Get bookings for a specific date, handling spanning bookings
   * Returns: { morning1: booking|null, morning2: booking|null }
   */
  getBookingsForDate(boat, dateStr) {
    if (!this.config || !this.config.club || !this.config.club.sessions) {
      return { morning1: null, morning2: null };
    }

    const result = { morning1: null, morning2: null };
    const sessions = this.config.club.sessions;

    // Check all bookings for this date
    boat.bookings.forEach(booking => {
      if (booking.date !== dateStr) return;

      // Parse booking times
      const [bookingStartHour, bookingStartMin] = booking.startTime.split(':').map(Number);
      const [bookingEndHour, bookingEndMin] = booking.endTime.split(':').map(Number);

      // Parse session times
      const [session1StartHour, session1StartMin] = sessions.morning1.start.split(':').map(Number);
      const [session1EndHour, session1EndMin] = sessions.morning1.end.split(':').map(Number);
      const [session2StartHour, session2StartMin] = sessions.morning2.start.split(':').map(Number);
      const [session2EndHour, session2EndMin] = sessions.morning2.end.split(':').map(Number);

      // Convert to minutes for easier comparison
      const bookingStart = bookingStartHour * 60 + bookingStartMin;
      const bookingEnd = bookingEndHour * 60 + bookingEndMin;
      const session1Start = session1StartHour * 60 + session1StartMin;
      const session1End = session1EndHour * 60 + session1EndMin;
      const session2Start = session2StartHour * 60 + session2StartMin;
      const session2End = session2EndHour * 60 + session2EndMin;

      // Check if booking overlaps with session 1
      if (bookingStart < session1End && bookingEnd > session1Start) {
        result.morning1 = booking;
      }

      // Check if booking overlaps with session 2
      if (bookingStart < session2End && bookingEnd > session2Start) {
        result.morning2 = booking;
      }
    });

    return result;
  }

  /**
   * Update the footer date display
   */
  updateClock() {
    const now = new Date();

    // Update footer date
    const footerStr = 'TODAY - ' + now.toLocaleDateString('en-AU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
    this.elements.todayDateFooter.textContent = footerStr;
  }

  /**
   * Update last updated timestamp
   */
  updateLastUpdated() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-AU', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    this.elements.lastUpdated.textContent = `Last updated: ${timeStr}`;
  }

  /**
   * Show a specific view (main, loading, error)
   */
  showView(view) {
    this.elements.loadingScreen.classList.add('hidden');
    this.elements.errorScreen.classList.add('hidden');
    this.elements.mainView.classList.add('hidden');

    switch (view) {
      case 'main':
        this.elements.mainView.classList.remove('hidden');
        break;
      case 'loading':
        this.elements.loadingScreen.classList.remove('hidden');
        break;
      case 'error':
        this.elements.errorScreen.classList.remove('hidden');
        break;
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    this.elements.errorMessage.textContent = message;
    this.showView('error');
  }

  /**
   * Get boat icon emoji based on type
   */
  getBoatIcon(type) {
    switch (type) {
      case '1X': return '🚣';
      case '2X':
      case '2-': return '🚣🚣';
      case '4X':
      case '4-':
      case '4+': return '🚣🚣🚣🚣';
      case '8X':
      case '8+': return '🚣🚣🚣🚣🚣🚣🚣🚣';
      default: return '🚣';
    }
  }

  /**
   * Format date as YYYY-MM-DD
   */
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('[TV Display] DOM loaded, initializing controller...');
  const controller = new TVDisplayController();
  controller.init();
});
