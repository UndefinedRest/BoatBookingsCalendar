/**
 * TV Display Controller - Two Column Layout
 * Shows ALL boats split into Club (left) and Race (right) columns
 */

class TVDisplayController {
  constructor() {
    this.refreshInterval = 600000; // 10 minutes
    this.clockInterval = 1000; // 1 second
    this.retryDelay = 30000; // 30 seconds on error

    this.elements = {
      loadingScreen: document.getElementById('loadingScreen'),
      errorScreen: document.getElementById('errorScreen'),
      errorMessage: document.getElementById('errorMessage'),
      mainView: document.getElementById('mainView'),
      clubBoatsList: document.getElementById('clubBoatsList'),
      raceBoatsList: document.getElementById('raceBoatsList'),
      todayDateFooter: document.getElementById('todayDateFooter'),
      lastUpdated: document.getElementById('lastUpdated'),
    };

    this.bookingData = null;
    this.config = null;
  }

  /**
   * Initialize and start the display
   */
  async init() {
    console.log('[TV Display] Initializing...');

    // Start clock immediately
    this.updateClock();
    setInterval(() => this.updateClock(), this.clockInterval);

    // Load initial data
    await this.loadData();

    // Schedule periodic refresh
    setInterval(() => this.loadData(), this.refreshInterval);
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

    // Split boats into Club and Race
    const { clubBoats, raceBoats } = this.splitBoatsByClassification();

    console.log('[TV Display] Rendering boats:', {
      club: clubBoats.length,
      race: raceBoats.length
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
   * Create a boat entry element (boat info on left, sessions stacked vertically on right)
   */
  createBoatEntry(boat) {
    const entry = document.createElement('div');
    entry.className = 'boat-entry';

    // Use nickname if available, otherwise display name
    const boatName = boat.nickname || boat.displayName;

    // Boat info (type badge + name) on left - fixed width
    const boatInfo = document.createElement('div');
    boatInfo.className = 'boat-info';
    boatInfo.innerHTML = `
      <span class="boat-type-badge">${boat.type}</span>
      <span class="boat-name-text" title="${this.escapeHtml(boatName)}">${this.escapeHtml(boatName)}</span>
    `;
    entry.appendChild(boatInfo);

    // Sessions (AM1 and AM2) stacked vertically on right
    const sessions = document.createElement('div');
    sessions.className = 'boat-sessions';

    // AM1 session
    const am1 = this.createSessionItem(boat, 'morning1', 'AM1');
    sessions.appendChild(am1);

    // AM2 session
    const am2 = this.createSessionItem(boat, 'morning2', 'AM2');
    sessions.appendChild(am2);

    entry.appendChild(sessions);

    return entry;
  }

  /**
   * Create a session item (AM1 or AM2)
   */
  createSessionItem(boat, sessionKey, sessionLabel) {
    const item = document.createElement('div');
    item.className = 'session-item';

    // Get booking for TODAY for this session
    const booking = this.getTodayBooking(boat, sessionKey);

    if (booking) {
      // Show booking: start time + member name
      item.innerHTML = `
        <span class="session-label">${sessionLabel}:</span>
        <div class="session-content">
          <span class="booking-time">${booking.startTime}</span>
          <span class="booking-member">${this.escapeHtml(booking.memberName)}</span>
        </div>
      `;
    } else {
      // Leave blank when available
      item.innerHTML = `
        <span class="session-label">${sessionLabel}:</span>
        <div class="session-content">
        </div>
      `;
    }

    return item;
  }

  /**
   * Get booking for today for a specific session
   */
  getTodayBooking(boat, sessionKey) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = this.formatDate(today);

    return boat.bookings.find(b =>
      b.date === todayStr && b.session === sessionKey
    );
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
