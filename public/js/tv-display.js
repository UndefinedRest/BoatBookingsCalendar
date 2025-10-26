/**
 * TV Display Controller
 * Manages the 55" TV booking display board
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
      noBookings: document.getElementById('noBookings'),
      bookingGrid: document.getElementById('bookingGrid'),
      bookingGridBody: document.getElementById('bookingGridBody'),
      currentDay: document.getElementById('currentDay'),
      currentTime: document.getElementById('currentTime'),
      todayDate: document.getElementById('todayDate'),
      tomorrowDate: document.getElementById('tomorrowDate'),
      weekDates: document.getElementById('weekDates'),
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
   * Render the booking grid
   */
  render() {
    if (!this.bookingData) return;

    // Update date headers
    this.updateDateHeaders();

    // Filter boats that have bookings today or tomorrow
    const boatsWithBookings = this.getBoatsWithRecentBookings();

    if (boatsWithBookings.length === 0) {
      // Show "all available" message
      this.elements.noBookings.classList.remove('hidden');
      this.elements.bookingGrid.classList.add('hidden');
      return;
    }

    // Hide "no bookings" message
    this.elements.noBookings.classList.add('hidden');
    this.elements.bookingGrid.classList.remove('hidden');

    // Clear existing rows
    this.elements.bookingGridBody.innerHTML = '';

    // Render each boat row
    boatsWithBookings.forEach(boat => {
      const row = this.createBoatRow(boat);
      this.elements.bookingGridBody.appendChild(row);
    });

    console.log('[TV Display] Rendered', boatsWithBookings.length, 'boats with bookings');
  }

  /**
   * Get boats that have bookings today or tomorrow
   */
  getBoatsWithRecentBookings() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

    return this.bookingData.boats.filter(boat => {
      return boat.bookings.some(booking => {
        const bookingDate = new Date(booking.date);
        bookingDate.setHours(0, 0, 0, 0);
        return bookingDate >= today && bookingDate < dayAfterTomorrow;
      });
    });
  }

  /**
   * Create a table row for a boat
   */
  createBoatRow(boat) {
    const row = document.createElement('tr');

    // Boat info cell
    const boatCell = document.createElement('td');
    boatCell.innerHTML = this.renderBoatInfo(boat);
    row.appendChild(boatCell);

    // Today cell (both sessions)
    const todayCell = document.createElement('td');
    todayCell.className = 'status-cell';
    todayCell.innerHTML = this.renderDayStatus(boat, 0); // Day 0 = today
    row.appendChild(todayCell);

    // Tomorrow cell (both sessions)
    const tomorrowCell = document.createElement('td');
    tomorrowCell.className = 'status-cell';
    tomorrowCell.innerHTML = this.renderDayStatus(boat, 1); // Day 1 = tomorrow
    row.appendChild(tomorrowCell);

    // Rest of week cell
    const weekCell = document.createElement('td');
    weekCell.className = 'status-cell';
    weekCell.innerHTML = this.renderWeekSummary(boat);
    row.appendChild(weekCell);

    return row;
  }

  /**
   * Render boat information cell
   */
  renderBoatInfo(boat) {
    const icon = this.getBoatIcon(boat.type);
    const weightInfo = boat.weight ? `⚖️ ${boat.weight} KG` : '';
    const classification = boat.classification === 'R' ? 'Racer' : boat.classification === 'RT' ? 'RT' : 'Training';

    return `
      <div class="boat-info">
        <div class="boat-header">
          <span class="boat-icon">${icon}</span>
          <span class="boat-name">${this.escapeHtml(boat.displayName)}</span>
        </div>
        ${boat.nickname ? `<div class="boat-nickname">${this.escapeHtml(boat.nickname)}</div>` : ''}
        <div class="boat-specs">
          <span class="boat-type-badge">${boat.type}</span>
          ${weightInfo ? `<span class="boat-weight">${weightInfo}</span>` : ''}
          <span class="boat-classification">${classification}</span>
        </div>
      </div>
    `;
  }

  /**
   * Render status for a specific day (both AM1 and AM2 sessions)
   */
  renderDayStatus(boat, dayOffset) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + dayOffset);
    targetDate.setHours(0, 0, 0, 0);

    const dateStr = this.formatDate(targetDate);

    // Find bookings for this day
    const dayBookings = boat.bookings.filter(b => b.date === dateStr);

    if (dayBookings.length === 0) {
      // Both sessions available
      return `
        <div class="session-status">
          <span class="status-indicator available" title="AM1 Available"></span>
          <span class="status-indicator available" title="AM2 Available"></span>
        </div>
      `;
    }

    // Check each session
    const am1Booking = dayBookings.find(b => b.session === 'morning1');
    const am2Booking = dayBookings.find(b => b.session === 'morning2');

    const am1Status = am1Booking ? 'booked' : 'available';
    const am2Status = am2Booking ? 'booked' : 'available';

    const am1Member = am1Booking ? `<div class="member-name">${this.escapeHtml(am1Booking.memberName)}</div>` : '';
    const am2Member = am2Booking ? `<div class="member-name">${this.escapeHtml(am2Booking.memberName)}</div>` : '';

    return `
      <div class="session-status">
        <div>
          <span class="status-indicator ${am1Status}" title="AM1 ${am1Status}"></span>
          ${am1Member}
        </div>
        <div>
          <span class="status-indicator ${am2Status}" title="AM2 ${am2Status}"></span>
          ${am2Member}
        </div>
      </div>
    `;
  }

  /**
   * Render week summary (Mon-Fri) as dots
   */
  renderWeekSummary(boat) {
    const dots = [];

    // Days 2-6 (Mon-Fri if today is Sat)
    for (let dayOffset = 2; dayOffset <= 6; dayOffset++) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + dayOffset);
      targetDate.setHours(0, 0, 0, 0);
      const dateStr = this.formatDate(targetDate);

      const hasBooking = boat.bookings.some(b => b.date === dateStr);
      const status = hasBooking ? 'booked' : 'available';

      dots.push(`<span class="week-dot ${status}" title="${this.formatDayName(targetDate)}: ${status}"></span>`);
    }

    // Check if there are any bookings
    const hasAnyBooking = boat.bookings.some(b => {
      const bookingDate = new Date(b.date);
      const today = new Date();
      today.setDate(today.getDate() + 2); // Start from day 2
      return bookingDate >= today;
    });

    const note = hasAnyBooking ? '<div class="week-note">Some bookings</div>' : '';

    return `
      <div class="week-summary">
        ${dots.join('')}
        ${note}
      </div>
    `;
  }

  /**
   * Update date headers
   */
  updateDateHeaders() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today header
    this.elements.todayDate.textContent = this.formatShortDate(today);

    // Tomorrow header
    this.elements.tomorrowDate.textContent = this.formatShortDate(tomorrow);

    // Week dates (Mon-Fri)
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() + 2);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 6);
    this.elements.weekDates.textContent = `${this.formatShortDate(weekStart)}-${this.formatShortDate(weekEnd)}`;
  }

  /**
   * Update the clock display
   */
  updateClock() {
    const now = new Date();

    // Update day
    const dayStr = now.toLocaleDateString('en-AU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).toUpperCase();
    this.elements.currentDay.textContent = dayStr;

    // Update time
    const prevTime = this.elements.currentTime.textContent;
    const timeStr = now.toLocaleTimeString('en-AU', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    this.elements.currentTime.textContent = timeStr;

    // Pulse animation on minute change
    if (prevTime !== '--:--' && prevTime !== timeStr) {
      this.elements.currentTime.classList.add('time-changed');
      setTimeout(() => {
        this.elements.currentTime.classList.remove('time-changed');
      }, 500);
    }
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
   * Format date as "Sat 26"
   */
  formatShortDate(date) {
    const day = date.toLocaleDateString('en-AU', { weekday: 'short' });
    const dayNum = date.getDate();
    return `${day} ${dayNum}`;
  }

  /**
   * Format date as day name
   */
  formatDayName(date) {
    return date.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
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
