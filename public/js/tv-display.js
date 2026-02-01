/**
 * TV Display Controller - Two Column Layout
 * Shows ALL boats split into Club (left) and Race (right) columns
 */

// Detect and apply display mode from query parameter
function applyDisplayMode() {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode');

  if (mode === 'tv' || mode === 'desktop' || mode === 'mobile') {
    document.body.classList.add(`mode-${mode}`);
    console.log(`[TV Display] Display mode forced to: ${mode}`);
  }
}

// Apply mode immediately on script load
applyDisplayMode();

class TVDisplayController {
  constructor() {
    this.clockInterval = 1000; // 1 second
    this.retryDelay = 30000; // 30 seconds on error

    this.elements = {
      loadingScreen: document.getElementById('loadingScreen'),
      errorScreen: document.getElementById('errorScreen'),
      errorMessage: document.getElementById('errorMessage'),
      mainView: document.getElementById('mainView'),
      clubBoatsList: document.getElementById('clubBoatsList'),
      raceBoatsList: document.getElementById('raceBoatsList'),
      tinniesList: document.getElementById('tinniesList'),
      tinniesSection: document.getElementById('tinniesSection'),
      clubDayHeaders: document.getElementById('clubDayHeaders'),
      raceDayHeaders: document.getElementById('raceDayHeaders'),
      tinniesDayHeaders: document.getElementById('tinniesDayHeaders'),
      todayDateFooter: document.getElementById('todayDateFooter'),
      lastUpdated: document.getElementById('lastUpdated'),
      clubColumnTitle: document.querySelector('.boat-column:first-child .column-title'),
      raceColumnTitle: document.querySelector('.boat-column:last-child .column-title:not(.tinnies-title)'),
      tinniesColumnTitle: document.querySelector('.tinnies-title'),
      footerLogo: document.querySelector('.footer-logo'),
      // Mobile portrait view elements
      mobilePortraitView: document.getElementById('mobilePortraitView'),
      dayNavTabs: document.getElementById('dayNavTabs'),
      dayNavPrev: document.getElementById('dayNavPrev'),
      dayNavNext: document.getElementById('dayNavNext'),
      mobileCardsContainer: document.getElementById('mobileCardsContainer'),
    };

    this.bookingData = null;
    this.config = null;
    this.tvDisplayConfig = null;
    this.daysToDisplay = 7; // Will be overridden by tvDisplayConfig
    this.refreshInterval = 300000; // Will be overridden by tvDisplayConfig
    this.refreshTimer = null; // Store timer reference for proper cleanup
    this.configCheckTimer = null; // Timer for checking config changes
    this.lastConfigVersion = null; // Track config version for change detection
    this.isInitialLoad = true; // Track if this is the first load
    this.countdownTimer = null; // Timer for countdown display
    this.countdownSeconds = 0; // Seconds remaining until next refresh

    // Mobile portrait view state
    this.selectedDayIndex = 0; // 0 = today, 1 = tomorrow, etc.
    this.collapsedSections = new Set(); // Track which sections are collapsed

    // Tooltip element (for desktop hover)
    this.tooltipElement = null;
  }

  /**
   * Initialize and start the display
   */
  async init() {
    console.log('[TV Display] Initializing...');

    // Load TV display configuration first
    await this.loadTVDisplayConfig();

    // Apply configuration to UI
    this.applyConfig();

    console.log(`[TV Display] Refresh interval: ${this.refreshInterval / 1000}s`);
    console.log(`[TV Display] Days to display: ${this.daysToDisplay}`);

    // Setup mobile view event listeners
    this.setupMobileEventListeners();

    // Setup desktop tooltip
    this.setupTooltip();

    // Listen for orientation changes
    window.addEventListener('orientationchange', () => {
      console.log('[TV Display] Orientation changed, re-rendering...');
      setTimeout(() => this.render(), 100); // Small delay for orientation to settle
    });

    // Listen for resize (for desktop browser testing)
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => this.render(), 150);
    });

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

    // Check for config changes every 30 seconds
    this.configCheckTimer = setInterval(() => {
      this.checkConfigChanges();
    }, 30000);
  }

  /**
   * Setup event listeners for mobile portrait view
   */
  setupMobileEventListeners() {
    // Day navigation arrow buttons
    if (this.elements.dayNavPrev) {
      this.elements.dayNavPrev.addEventListener('click', () => {
        if (this.selectedDayIndex > 0) {
          this.selectedDayIndex--;
          this.renderMobileView();
        }
      });
    }

    if (this.elements.dayNavNext) {
      this.elements.dayNavNext.addEventListener('click', () => {
        if (this.selectedDayIndex < this.daysToDisplay - 1) {
          this.selectedDayIndex++;
          this.renderMobileView();
        }
      });
    }
  }

  /**
   * Setup tooltip for desktop hover on bookings
   */
  setupTooltip() {
    // Only setup on devices with hover capability
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      return;
    }

    // Create tooltip element
    this.tooltipElement = document.createElement('div');
    this.tooltipElement.className = 'booking-tooltip';
    this.tooltipElement.innerHTML = `
      <div class="tooltip-boat"></div>
      <div class="tooltip-member"></div>
      <div class="tooltip-time"></div>
    `;
    document.body.appendChild(this.tooltipElement);

    // Use event delegation on the main view container
    const container = this.elements.mainView;
    if (!container) return;

    container.addEventListener('mouseenter', (e) => {
      const target = e.target.closest('.session-item.has-booking');
      if (target) {
        this.showTooltip(target);
      }
    }, true);

    container.addEventListener('mouseleave', (e) => {
      const target = e.target.closest('.session-item.has-booking');
      if (target) {
        this.hideTooltip();
      }
    }, true);

    container.addEventListener('mousemove', (e) => {
      if (this.tooltipElement.classList.contains('visible')) {
        this.positionTooltip(e.clientX, e.clientY);
      }
    });
  }

  /**
   * Show tooltip with booking details
   */
  showTooltip(element) {
    const boat = element.getAttribute('data-tooltip-boat');
    const member = element.getAttribute('data-tooltip-member');
    const time = element.getAttribute('data-tooltip-time');

    this.tooltipElement.querySelector('.tooltip-boat').textContent = boat;
    this.tooltipElement.querySelector('.tooltip-member').textContent = member;
    this.tooltipElement.querySelector('.tooltip-time').textContent = time;

    this.tooltipElement.classList.add('visible');
  }

  /**
   * Hide tooltip
   */
  hideTooltip() {
    if (this.tooltipElement) {
      this.tooltipElement.classList.remove('visible');
    }
  }

  /**
   * Position tooltip near cursor
   */
  positionTooltip(x, y) {
    const tooltip = this.tooltipElement;
    const padding = 15;

    // Position above and to the right of cursor
    let left = x + padding;
    let top = y - tooltip.offsetHeight - padding;

    // Keep within viewport bounds
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Flip to left if too close to right edge
    if (left + tooltip.offsetWidth > viewportWidth - padding) {
      left = x - tooltip.offsetWidth - padding;
    }

    // Flip below if too close to top
    if (top < padding) {
      top = y + padding;
    }

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  /**
   * Check if current viewport is mobile portrait
   */
  isMobilePortrait() {
    // Check for forced mode first
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    if (mode === 'mobile-portrait') return true;
    if (mode === 'tv' || mode === 'desktop' || mode === 'mobile') return false;

    // Check viewport: width < 768px AND portrait orientation
    const isNarrow = window.innerWidth < 768;
    const isPortrait = window.innerHeight > window.innerWidth;

    return isNarrow && isPortrait;
  }

  /**
   * Load TV display configuration
   */
  async loadTVDisplayConfig() {
    try {
      console.log('[TV Display] Loading TV display configuration...');

      const response = await fetch('/api/v1/config/tv-display');
      if (!response.ok) {
        throw new Error('Failed to fetch TV display config');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error('API returned error for TV display config');
      }

      this.tvDisplayConfig = result.data;
      this.lastConfigVersion = result.data.version;

      // Update local settings from config
      this.daysToDisplay = this.tvDisplayConfig.layout.daysToDisplay;
      this.refreshInterval = this.tvDisplayConfig.timing.refreshInterval;

      console.log('[TV Display] TV display config loaded:', this.tvDisplayConfig);

    } catch (error) {
      console.error('[TV Display] Error loading TV display config, using defaults:', error);
      // Use default values if config fails to load
      this.daysToDisplay = 5;
      this.refreshInterval = 300000;
    }
  }

  /**
   * Apply configuration to the UI
   */
  applyConfig() {
    if (!this.tvDisplayConfig) {
      console.log('[TV Display] No TV display config to apply');
      return;
    }

    const root = document.documentElement;
    const config = this.tvDisplayConfig;

    console.log('[TV Display] Applying configuration...');

    // Apply layout settings
    root.style.setProperty('--days-to-display', config.layout.daysToDisplay);
    root.style.setProperty('--boat-row-height', `${config.layout.boatRowHeight}px`);
    root.style.setProperty('--session-row-height', `${config.layout.sessionRowHeight}px`);
    root.style.setProperty('--boat-name-width', `${config.layout.boatNameWidth}px`);

    // Apply typography settings
    root.style.setProperty('--font-boat-name', `${config.typography.boatNameSize}px`);
    root.style.setProperty('--font-booking', `${config.typography.bookingDetailsSize}px`);
    root.style.setProperty('--font-column-title', `${config.typography.columnTitleSize}px`);

    // Apply boat type colors
    root.style.setProperty('--boat-type-1x-bg', config.colors.boatTypes.singles);
    root.style.setProperty('--boat-type-2x-bg', config.colors.boatTypes.doubles);
    root.style.setProperty('--boat-type-4x-bg', config.colors.boatTypes.quads);
    root.style.setProperty('--boat-type-tinnies-bg', config.colors.boatTypes.tinnies);
    root.style.setProperty('--boat-type-other-bg', config.colors.boatTypes.other);

    // Apply row colors
    root.style.setProperty('--row-color-even', config.colors.rows.even);
    root.style.setProperty('--row-color-odd', config.colors.rows.odd);

    // Apply UI colors
    root.style.setProperty('--boat-type-badge-bg', config.colors.ui.boatTypeBadge);
    root.style.setProperty('--column-header-bg', config.colors.ui.columnHeader);
    root.style.setProperty('--booking-time-color', config.colors.ui.bookingTime);
    root.style.setProperty('--type-separator-color', config.colors.ui.typeSeparator);

    // Apply damaged boat colors
    if (config.colors.damaged) {
      root.style.setProperty('--damaged-row-bg', config.colors.damaged.rowBackground);
      root.style.setProperty('--damaged-icon-color', config.colors.damaged.iconColor);
      root.style.setProperty('--damaged-text-color', config.colors.damaged.textColor);
    }

    // Apply column titles
    if (this.elements.clubColumnTitle) {
      this.elements.clubColumnTitle.textContent = config.columns.leftTitle;
    }
    if (this.elements.raceColumnTitle) {
      this.elements.raceColumnTitle.textContent = config.columns.rightTitle;
    }
    if (this.elements.tinniesColumnTitle && config.columns.tinniesTitle) {
      this.elements.tinniesColumnTitle.textContent = config.columns.tinniesTitle;
    }

    // Apply logo URL
    if (this.elements.footerLogo && config.display && config.display.logoUrl) {
      this.elements.footerLogo.src = config.display.logoUrl;
      this.elements.footerLogo.style.display = ''; // Ensure it's visible
    }

    // Start/restart countdown timer with new refresh interval
    this.startCountdown();

    console.log('[TV Display] Configuration applied successfully');
  }

  /**
   * Check for configuration changes
   */
  async checkConfigChanges() {
    try {
      const response = await fetch('/api/v1/config/tv-display');
      if (!response.ok) return;

      const result = await response.json();
      if (!result.success) return;

      const newVersion = result.data.version;

      // If version changed, reload config and apply
      if (newVersion !== this.lastConfigVersion) {
        console.log('[TV Display] Configuration changed, reloading...');
        this.tvDisplayConfig = result.data;
        this.lastConfigVersion = newVersion;

        // Check if refresh interval changed
        const oldRefreshInterval = this.refreshInterval;
        this.daysToDisplay = this.tvDisplayConfig.layout.daysToDisplay;
        this.refreshInterval = this.tvDisplayConfig.timing.refreshInterval;

        // Apply new config
        this.applyConfig();

        // Re-render to apply layout changes (like days to display)
        this.render();

        // If refresh interval changed, restart the timer
        if (oldRefreshInterval !== this.refreshInterval) {
          console.log('[TV Display] Refresh interval changed, restarting timer');
          if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
          }
          this.refreshTimer = setInterval(() => {
            console.log('[TV Display] Auto-refresh triggered');
            this.loadData();
          }, this.refreshInterval);
        }
      }
    } catch (error) {
      // Silently fail - don't disrupt the display
      console.error('[TV Display] Error checking config changes:', error);
    }
  }

  /**
   * Load booking data and configuration from API
   * On initial load: Show loading screen
   * On refresh: Update silently in background
   */
  async loadData() {
    try {
      // Only show loading screen on initial load
      if (this.isInitialLoad) {
        console.log('[TV Display] Initial load - showing loading screen');
      } else {
        console.log('[TV Display] Background refresh - fetching new data silently...');
      }

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
        totalBookings: this.bookingData.metadata.totalBookings,
        backgroundUpdate: !this.isInitialLoad
      });

      // Render the display (seamlessly updates existing view)
      this.render();

      // Only show view transition on initial load
      if (this.isInitialLoad) {
        this.showView('main');
        this.isInitialLoad = false;
        console.log('[TV Display] Initial load complete - display is now visible');
      } else {
        console.log('[TV Display] Background update complete - display updated silently');
      }

      // Update last updated timestamp and reset countdown
      this.updateLastUpdated();
      this.startCountdown();

    } catch (error) {
      console.error('[TV Display] Error loading data:', error);

      // On initial load: Show error screen
      // On refresh: Log error but keep showing existing data
      if (this.isInitialLoad) {
        this.showError(error.message);
      } else {
        console.error('[TV Display] Background refresh failed - keeping existing data visible');
        // Don't show error screen, just log it
      }

      // Retry after delay
      setTimeout(() => this.loadData(), this.retryDelay);
    }
  }

  /**
   * Render the appropriate view based on viewport
   */
  render() {
    if (!this.bookingData) return;

    // Check if we're in mobile portrait mode
    if (this.isMobilePortrait()) {
      console.log('[TV Display] Rendering mobile portrait view');
      this.renderMobileView();
    } else {
      console.log('[TV Display] Rendering grid view');
      this.renderGridView();
    }
  }

  /**
   * Render the two-column boat display (desktop/TV/landscape)
   */
  renderGridView() {
    // Generate day headers for all columns
    this.renderDayHeaders();

    // Split boats into Club, Race, and Tinnies
    const { clubBoats, raceBoats, tinnies } = this.splitBoatsByClassification();

    console.log('[TV Display] Rendering boats:', {
      club: clubBoats.length,
      race: raceBoats.length,
      tinnies: tinnies.length,
      daysToDisplay: this.daysToDisplay
    });

    // Render club boats (left column)
    this.elements.clubBoatsList.innerHTML = '';
    let prevClubType = null;
    clubBoats.forEach(boat => {
      const entry = this.createBoatEntry(boat, prevClubType);
      this.elements.clubBoatsList.appendChild(entry);
      prevClubType = boat.type;
    });

    // Render race boats (right column, top section)
    this.elements.raceBoatsList.innerHTML = '';
    let prevRaceType = null;
    raceBoats.forEach(boat => {
      const entry = this.createBoatEntry(boat, prevRaceType);
      this.elements.raceBoatsList.appendChild(entry);
      prevRaceType = boat.type;
    });

    // Render tinnies (right column, bottom section)
    if (this.elements.tinniesList) {
      this.elements.tinniesList.innerHTML = '';
      tinnies.forEach(boat => {
        const entry = this.createBoatEntry(boat, null, true);
        this.elements.tinniesList.appendChild(entry);
      });

      // Show/hide tinnies section based on whether there are any
      if (this.elements.tinniesSection) {
        this.elements.tinniesSection.style.display = tinnies.length > 0 ? '' : 'none';
      }
    }
  }

  /**
   * Render mobile portrait card view
   */
  renderMobileView() {
    if (!this.elements.mobileCardsContainer || !this.elements.dayNavTabs) return;

    // Render day navigation tabs
    this.renderDayNavTabs();

    // Update arrow button states
    this.updateDayNavArrows();

    // Get selected date string
    const today = new Date();
    const selectedDate = new Date(today);
    selectedDate.setDate(today.getDate() + this.selectedDayIndex);
    const selectedDateStr = this.formatDate(selectedDate);

    // Split boats into categories
    const { clubBoats, raceBoats, tinnies } = this.splitBoatsByClassification();

    // Clear and render cards container
    this.elements.mobileCardsContainer.innerHTML = '';

    // Render Club Boats section
    this.renderMobileSection('club', 'CLUB BOATS', clubBoats, selectedDateStr);

    // Render Race Boats section
    this.renderMobileSection('race', 'RACE BOATS', raceBoats, selectedDateStr);

    // Render Tinnies section (if any)
    if (tinnies.length > 0) {
      this.renderMobileSection('tinnies', 'TINNIES', tinnies, selectedDateStr);
    }
  }

  /**
   * Render day navigation tabs
   */
  renderDayNavTabs() {
    this.elements.dayNavTabs.innerHTML = '';

    const today = new Date();
    for (let i = 0; i < this.daysToDisplay; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      const tab = document.createElement('button');
      tab.className = 'day-tab' + (i === this.selectedDayIndex ? ' active' : '');
      tab.dataset.dayIndex = i;

      if (i === 0) {
        tab.textContent = 'TODAY';
      } else {
        const dayName = date.toLocaleDateString('en-AU', { weekday: 'short' }).toUpperCase();
        const dayNum = date.getDate();
        tab.textContent = `${dayName} ${dayNum}`;
      }

      // Click handler
      tab.addEventListener('click', () => {
        this.selectedDayIndex = i;
        this.renderMobileView();
      });

      this.elements.dayNavTabs.appendChild(tab);
    }

    // Scroll active tab into view
    const activeTab = this.elements.dayNavTabs.querySelector('.active');
    if (activeTab) {
      activeTab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }

  /**
   * Update day navigation arrow button states
   */
  updateDayNavArrows() {
    if (this.elements.dayNavPrev) {
      this.elements.dayNavPrev.disabled = this.selectedDayIndex === 0;
    }
    if (this.elements.dayNavNext) {
      this.elements.dayNavNext.disabled = this.selectedDayIndex >= this.daysToDisplay - 1;
    }
  }

  /**
   * Render a section of boat cards for mobile view
   */
  renderMobileSection(sectionId, title, boats, dateStr) {
    const container = this.elements.mobileCardsContainer;

    // Section header
    const header = document.createElement('div');
    header.className = 'mobile-section-header' + (this.collapsedSections.has(sectionId) ? ' collapsed' : '');
    header.innerHTML = `
      <span>${title} (${boats.length})</span>
      <span class="section-toggle">${this.collapsedSections.has(sectionId) ? '▶' : '▼'}</span>
    `;
    header.addEventListener('click', () => {
      if (this.collapsedSections.has(sectionId)) {
        this.collapsedSections.delete(sectionId);
      } else {
        this.collapsedSections.add(sectionId);
      }
      this.renderMobileView();
    });
    container.appendChild(header);

    // Section boats container
    const boatsContainer = document.createElement('div');
    boatsContainer.className = 'mobile-section-boats';

    if (!this.collapsedSections.has(sectionId)) {
      // Render boat cards
      boats.forEach(boat => {
        const card = this.createMobileBoatCard(boat, dateStr, sectionId === 'tinnies');
        boatsContainer.appendChild(card);
      });
    }

    container.appendChild(boatsContainer);
  }

  /**
   * Create a boat card for mobile view
   */
  createMobileBoatCard(boat, dateStr, isTinnie = false) {
    const card = document.createElement('div');
    card.className = 'mobile-boat-card';

    // Add boat type class
    const typeClass = isTinnie ? 'type-tinnie' : this.getBoatTypeClass(boat.type);
    card.classList.add(typeClass);

    // Check if damaged
    const isDamaged = this.isDamagedBoat(boat);
    if (isDamaged) {
      card.classList.add('damaged');
    }

    // Boat name
    const boatName = boat.nickname || boat.displayName;

    // Build header HTML
    let headerHTML = '';
    if (!isTinnie) {
      headerHTML += `<span class="mobile-boat-badge">${boat.type}</span>`;
    }
    if (isDamaged) {
      headerHTML += '<span class="mobile-damaged-badge">⚠️ DAMAGED</span>';
    }
    headerHTML += `<span class="mobile-boat-name" title="${this.escapeHtml(boatName)}">${this.escapeHtml(boatName)}</span>`;
    if (boat.weight && boat.weight !== 'null') {
      headerHTML += `<span class="mobile-boat-weight">${boat.weight}kg</span>`;
    }

    // Header
    const header = document.createElement('div');
    header.className = 'mobile-boat-header';
    header.innerHTML = headerHTML;
    card.appendChild(header);

    // Sessions container
    const sessionsContainer = document.createElement('div');
    sessionsContainer.className = 'mobile-sessions';

    // Get bookings for selected date
    const bookings = this.getBookingsForDate(boat, dateStr);

    // AM1 session
    const am1Row = this.createMobileSessionRow('AM1', bookings.morning1);
    sessionsContainer.appendChild(am1Row);

    // AM2 session
    const am2Row = this.createMobileSessionRow('AM2', bookings.morning2);
    sessionsContainer.appendChild(am2Row);

    // Add damaged overlay if applicable
    if (isDamaged) {
      const overlay = document.createElement('div');
      overlay.className = 'mobile-damaged-overlay';
      overlay.textContent = 'DAMAGED';
      sessionsContainer.appendChild(overlay);
    }

    card.appendChild(sessionsContainer);

    return card;
  }

  /**
   * Create a session row for mobile view
   */
  createMobileSessionRow(label, booking) {
    const row = document.createElement('div');
    row.className = 'mobile-session-row';

    const labelSpan = document.createElement('span');
    labelSpan.className = 'mobile-session-label';
    labelSpan.textContent = label;
    row.appendChild(labelSpan);

    if (booking) {
      const timeSpan = document.createElement('span');
      timeSpan.className = 'mobile-session-time';
      timeSpan.textContent = booking.startTime;
      row.appendChild(timeSpan);

      const memberSpan = document.createElement('span');
      memberSpan.className = 'mobile-session-member';
      memberSpan.textContent = this.formatMemberName(booking.memberName);
      row.appendChild(memberSpan);
    } else {
      const timeSpan = document.createElement('span');
      timeSpan.className = 'mobile-session-time';
      timeSpan.textContent = '—';
      row.appendChild(timeSpan);

      const availableSpan = document.createElement('span');
      availableSpan.className = 'mobile-session-member mobile-session-available';
      availableSpan.textContent = 'available';
      row.appendChild(availableSpan);
    }

    return row;
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

    // Render for tinnies section
    if (this.elements.tinniesDayHeaders) {
      this.elements.tinniesDayHeaders.innerHTML = '';
      headers.forEach(header => {
        this.elements.tinniesDayHeaders.appendChild(header.cloneNode(true));
      });
    }
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
   * Split boats by classification (Club vs Race) and category (Rowing vs Tinnie)
   */
  splitBoatsByClassification() {
    const clubBoats = [];
    const raceBoats = [];
    const tinnies = [];

    this.bookingData.boats.forEach(boat => {
      // Filter out boats with Unknown type (unless they're tinnies)
      if (boat.type === 'Unknown' && boat.category !== 'tinnie') {
        return;
      }

      // Tinnies go to their own section
      if (boat.category === 'tinnie') {
        tinnies.push(boat);
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

    // Sort tinnies by display name
    tinnies.sort((a, b) => getBoatName(a).localeCompare(getBoatName(b)));

    return { clubBoats, raceBoats, tinnies };
  }

  /**
   * Create a boat entry element (boat info on left, multi-day grid on right)
   */
  createBoatEntry(boat, previousType = null, isTinnie = false) {
    const entry = document.createElement('div');
    entry.className = 'boat-entry';

    // Add boat type background color class
    const typeClass = isTinnie ? 'type-tinnie' : this.getBoatTypeClass(boat.type);
    entry.classList.add(typeClass);

    // Add separator class if boat type changed from previous
    if (previousType !== null && boat.type !== previousType) {
      entry.classList.add('type-separator');
    }

    // Use nickname if available, otherwise display name
    const boatName = boat.nickname || boat.displayName;

    // Check if boat is damaged (check all name fields)
    const isDamaged = this.isDamagedBoat(boat);
    if (isDamaged) {
      entry.classList.add('damaged-boat');
    }

    // Build boat info HTML (no type badge for tinnies)
    let boatInfoHTML = `
      ${isTinnie ? '' : `<span class="boat-type-badge">${boat.type}</span>`}
      ${isDamaged ? '<span class="damaged-icon" title="Boat is damaged">⚠️</span>' : ''}
      <span class="boat-name-text" title="${this.escapeHtml(boatName)}">${this.escapeHtml(boatName)}</span>
    `;

    // Add badges (weight and sweep) in vertical container if either exists
    if ((boat.weight && boat.weight !== 'null') || boat.sweepCapable) {
      boatInfoHTML += `<div class="boat-badges-vertical">`;

      // Add weight badge if weight is available
      if (boat.weight && boat.weight !== 'null') {
        boatInfoHTML += `<span class="boat-weight">${boat.weight}kg</span>`;
      }

      // Add sweep badge if boat is sweep capable (below weight)
      if (boat.sweepCapable) {
        boatInfoHTML += `<span class="boat-sweep-badge">SWEEP</span>`;
      }

      boatInfoHTML += `</div>`;
    }

    // Boat info (type badge + name + weight + sweep) on left - fixed width
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
      const am1 = this.createSessionItem(bookings.morning1, boatName);
      dayColumn.appendChild(am1);

      // AM2 session for this day
      const am2 = this.createSessionItem(bookings.morning2, boatName);
      dayColumn.appendChild(am2);

      daysGrid.appendChild(dayColumn);
    }

    entry.appendChild(daysGrid);

    // Add damaged overlay if boat is damaged
    if (isDamaged) {
      const damagedOverlay = document.createElement('div');
      damagedOverlay.className = 'damaged-overlay';
      damagedOverlay.textContent = 'DAMAGED';
      entry.appendChild(damagedOverlay);
    }

    return entry;
  }

  /**
   * Create a session item - without label
   */
  createSessionItem(booking, boatName = '') {
    const item = document.createElement('div');
    item.className = 'session-item';

    if (booking) {
      // Format member name based on configuration
      const formattedName = this.formatMemberName(booking.memberName);

      // Add tooltip data for desktop hover
      item.classList.add('has-booking');
      item.setAttribute('data-tooltip-boat', boatName);
      item.setAttribute('data-tooltip-member', booking.memberName);
      item.setAttribute('data-tooltip-time', `${booking.startTime} - ${booking.endTime}`);

      // Show booking: start time + member name (no label)
      item.innerHTML = `
        <span class="booking-time">${booking.startTime}</span>
        <span class="booking-member">${this.escapeHtml(formattedName)}</span>
      `;
    } else {
      // Leave blank when available
      item.innerHTML = '';
    }

    return item;
  }

  /**
   * Format member name based on configuration
   */
  formatMemberName(fullName) {
    if (!this.tvDisplayConfig || !this.tvDisplayConfig.display) {
      return fullName; // Fallback to full name
    }

    const format = this.tvDisplayConfig.display.memberNameFormat;

    switch (format) {
      case 'first-only': {
        // Return only first name (before first space)
        const parts = fullName.trim().split(/\s+/);
        return parts[0];
      }

      case 'first-last-initial': {
        // Return first name + last initial (e.g., "John D")
        const parts = fullName.trim().split(/\s+/);
        if (parts.length === 1) {
          return parts[0]; // Only one name part
        }
        const firstName = parts[0];
        const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
        return `${firstName} ${lastInitial}`;
      }

      case 'full':
      default:
        return fullName;
    }
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
   * Start or restart the countdown timer to next refresh
   */
  startCountdown() {
    // Clear any existing countdown timer
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }

    // Reset countdown to full refresh interval (in seconds)
    this.countdownSeconds = Math.round(this.refreshInterval / 1000);

    const autoRefreshDisplay = document.getElementById('autoRefreshDisplay');
    if (!autoRefreshDisplay) return;

    // Update display immediately
    this.updateCountdownDisplay(autoRefreshDisplay);

    // Start countdown interval (every second)
    this.countdownTimer = setInterval(() => {
      this.countdownSeconds--;

      if (this.countdownSeconds <= 0) {
        // Countdown complete - will be reset when data loads
        this.countdownSeconds = 0;
      }

      this.updateCountdownDisplay(autoRefreshDisplay);
    }, 1000);
  }

  /**
   * Update the countdown display element
   */
  updateCountdownDisplay(element) {
    const minutes = Math.floor(this.countdownSeconds / 60);
    const seconds = this.countdownSeconds % 60;
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    element.textContent = `• Next update: ${timeStr}`;
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
   * Get CSS class for boat type background color
   */
  getBoatTypeClass(type) {
    switch (type) {
      case '1X': return 'type-1x';
      case '2X': return 'type-2x';
      case '4X': return 'type-4x';
      case '8X': return 'type-other';
      default: return 'type-other';
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

  /**
   * Check if boat is damaged based on name or full boat data
   */
  isDamagedBoat(boat) {
    // Check if boat is a string (legacy) or object
    if (typeof boat === 'string') {
      return boat.toLowerCase().includes('damaged');
    }

    // Check nickname, displayName, and fullName for "damaged"
    const nickname = (boat.nickname || '').toLowerCase();
    const displayName = (boat.displayName || '').toLowerCase();
    const fullName = (boat.fullName || '').toLowerCase();

    return nickname.includes('damaged') ||
           displayName.includes('damaged') ||
           fullName.includes('damaged');
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('[TV Display] DOM loaded, initializing controller...');
  const controller = new TVDisplayController();
  controller.init();
});
