/**
 * Configuration Page Controller
 * Handles loading, saving, and resetting TV display configuration
 */

class ConfigController {
  constructor() {
    this.form = document.getElementById('configForm');
    this.resetBtn = document.getElementById('resetBtn');
    this.forceRefreshBtn = document.getElementById('forceRefreshBtn');
    this.statusMessage = document.getElementById('statusMessage');

    this.currentConfig = null;

    // Initialize
    this.init();
  }

  /**
   * Initialize the controller
   */
  async init() {
    console.log('[Config] Initializing...');

    // Setup event listeners
    this.setupEventListeners();

    // Load current configuration
    await this.loadConfig();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Form submission
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveConfig();
    });

    // Reset button
    this.resetBtn.addEventListener('click', () => {
      this.resetConfig();
    });

    // Force refresh button
    this.forceRefreshBtn.addEventListener('click', () => {
      this.forceRefresh();
    });

    // Setup slider-number input sync for all range inputs
    this.setupSliderSync('daysToDisplay');
    this.setupSliderSync('boatRowHeight');
    this.setupSliderSync('sessionRowHeight');
    this.setupSliderSync('boatNameWidth');
    this.setupSliderSync('boatNameSize');
    this.setupSliderSync('bookingDetailsSize');
    this.setupSliderSync('columnTitleSize');
    this.setupSliderSync('refreshInterval');

    // Setup color picker-text input sync
    this.setupColorSync('colorSingles');
    this.setupColorSync('colorDoubles');
    this.setupColorSync('colorQuads');
    this.setupColorSync('colorOther');
    this.setupColorSync('colorRowEven');
    this.setupColorSync('colorRowOdd');
    this.setupColorSync('colorBoatTypeBadge');
    this.setupColorSync('colorColumnHeader');
    this.setupColorSync('colorBookingTime');
    this.setupColorSync('colorTypeSeparator');
  }

  /**
   * Setup bidirectional sync between slider and number input
   */
  setupSliderSync(baseName) {
    const slider = document.getElementById(baseName);
    const numberInput = document.getElementById(`${baseName}Value`);

    if (!slider || !numberInput) return;

    // Slider changes number input
    slider.addEventListener('input', () => {
      numberInput.value = slider.value;
    });

    // Number input changes slider
    numberInput.addEventListener('input', () => {
      slider.value = numberInput.value;
    });
  }

  /**
   * Setup bidirectional sync between color picker and text input
   */
  setupColorSync(baseName) {
    const colorPicker = document.getElementById(baseName);
    const textInput = document.getElementById(`${baseName}Text`);

    if (!colorPicker || !textInput) return;

    // Color picker changes text input
    colorPicker.addEventListener('input', () => {
      textInput.value = colorPicker.value.toUpperCase();
    });

    // Text input changes color picker (with validation)
    textInput.addEventListener('input', () => {
      const value = textInput.value;
      if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
        colorPicker.value = value;
      }
    });
  }

  /**
   * Load configuration from API
   */
  async loadConfig() {
    try {
      console.log('[Config] Loading configuration...');

      const response = await fetch('/api/v1/config/tv-display');
      if (!response.ok) {
        throw new Error('Failed to load configuration');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error('API returned error');
      }

      this.currentConfig = result.data;
      console.log('[Config] Configuration loaded:', this.currentConfig);

      // Populate form with current config
      this.populateForm(this.currentConfig);

    } catch (error) {
      console.error('[Config] Error loading configuration:', error);
      this.showStatus('error', 'Failed to load configuration. Using defaults.');
    }
  }

  /**
   * Populate form fields with configuration values
   */
  populateForm(config) {
    // Layout
    this.setSliderValue('daysToDisplay', config.layout.daysToDisplay);
    this.setSliderValue('boatRowHeight', config.layout.boatRowHeight);
    this.setSliderValue('sessionRowHeight', config.layout.sessionRowHeight);
    this.setSliderValue('boatNameWidth', config.layout.boatNameWidth);

    // Typography
    this.setSliderValue('boatNameSize', config.typography.boatNameSize);
    this.setSliderValue('bookingDetailsSize', config.typography.bookingDetailsSize);
    this.setSliderValue('columnTitleSize', config.typography.columnTitleSize);

    // Columns
    document.getElementById('leftTitle').value = config.columns.leftTitle;
    document.getElementById('rightTitle').value = config.columns.rightTitle;

    // Display options
    if (config.display && config.display.memberNameFormat) {
      document.getElementById('memberNameFormat').value = config.display.memberNameFormat;
    }
    if (config.display && config.display.logoUrl) {
      document.getElementById('logoUrl').value = config.display.logoUrl;
    }

    // Colors - Boat Types
    this.setColorValue('colorSingles', config.colors.boatTypes.singles);
    this.setColorValue('colorDoubles', config.colors.boatTypes.doubles);
    this.setColorValue('colorQuads', config.colors.boatTypes.quads);
    this.setColorValue('colorOther', config.colors.boatTypes.other);

    // Colors - Rows
    this.setColorValue('colorRowEven', config.colors.rows.even);
    this.setColorValue('colorRowOdd', config.colors.rows.odd);

    // Colors - UI
    this.setColorValue('colorBoatTypeBadge', config.colors.ui.boatTypeBadge);
    this.setColorValue('colorColumnHeader', config.colors.ui.columnHeader);
    this.setColorValue('colorBookingTime', config.colors.ui.bookingTime);
    this.setColorValue('colorTypeSeparator', config.colors.ui.typeSeparator);

    // Timing (convert from milliseconds to minutes)
    this.setSliderValue('refreshInterval', config.timing.refreshInterval / 60000);
  }

  /**
   * Set slider and number input value
   */
  setSliderValue(baseName, value) {
    const slider = document.getElementById(baseName);
    const numberInput = document.getElementById(`${baseName}Value`);

    if (slider) slider.value = value;
    if (numberInput) numberInput.value = value;
  }

  /**
   * Set color picker and text input value
   */
  setColorValue(baseName, value) {
    const colorPicker = document.getElementById(baseName);
    const textInput = document.getElementById(`${baseName}Text`);

    if (colorPicker) colorPicker.value = value;
    if (textInput) textInput.value = value.toUpperCase();
  }

  /**
   * Get configuration from form fields
   */
  getFormConfig() {
    return {
      version: (this.currentConfig?.version || 0) + 1,

      layout: {
        daysToDisplay: parseInt(document.getElementById('daysToDisplay').value),
        boatRowHeight: parseInt(document.getElementById('boatRowHeight').value),
        sessionRowHeight: parseInt(document.getElementById('sessionRowHeight').value),
        boatNameWidth: parseInt(document.getElementById('boatNameWidth').value),
      },

      typography: {
        boatNameSize: parseInt(document.getElementById('boatNameSize').value),
        bookingDetailsSize: parseInt(document.getElementById('bookingDetailsSize').value),
        columnTitleSize: parseInt(document.getElementById('columnTitleSize').value),
      },

      columns: {
        leftTitle: document.getElementById('leftTitle').value.trim(),
        rightTitle: document.getElementById('rightTitle').value.trim(),
      },

      display: {
        memberNameFormat: document.getElementById('memberNameFormat').value,
        logoUrl: document.getElementById('logoUrl').value.trim(),
      },

      colors: {
        boatTypes: {
          singles: document.getElementById('colorSingles').value,
          doubles: document.getElementById('colorDoubles').value,
          quads: document.getElementById('colorQuads').value,
          other: document.getElementById('colorOther').value,
        },
        rows: {
          even: document.getElementById('colorRowEven').value,
          odd: document.getElementById('colorRowOdd').value,
        },
        ui: {
          boatTypeBadge: document.getElementById('colorBoatTypeBadge').value,
          columnHeader: document.getElementById('colorColumnHeader').value,
          bookingTime: document.getElementById('colorBookingTime').value,
          typeSeparator: document.getElementById('colorTypeSeparator').value,
        },
        // Preserve damaged colors from current config (no UI for these)
        damaged: this.currentConfig?.colors?.damaged || {
          rowBackground: '#fee2e2',
          iconColor: '#dc2626',
          textColor: '#991b1b',
        },
      },

      timing: {
        // Convert from minutes to milliseconds
        refreshInterval: parseInt(document.getElementById('refreshInterval').value) * 60000,
      },
    };
  }

  /**
   * Save configuration to API
   */
  async saveConfig() {
    try {
      console.log('[Config] Saving configuration...');

      // Get form data
      const config = this.getFormConfig();
      console.log('[Config] Form config:', config);

      // Show loading state
      const submitBtn = this.form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.classList.add('loading');

      // Send to API
      const response = await fetch('/api/v1/config/tv-display', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error('Failed to save configuration');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'API returned error');
      }

      // Update current config
      this.currentConfig = result.data;

      console.log('[Config] Configuration saved successfully');
      this.showStatus('success', 'Configuration saved successfully! Changes will appear on the TV display within a minute.');

      // Remove loading state
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');

    } catch (error) {
      console.error('[Config] Error saving configuration:', error);
      this.showStatus('error', `Failed to save configuration: ${error.message}`);

      // Remove loading state
      const submitBtn = this.form.querySelector('button[type="submit"]');
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
    }
  }

  /**
   * Reset configuration to defaults
   */
  async resetConfig() {
    if (!confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      return;
    }

    try {
      console.log('[Config] Resetting configuration to defaults...');

      // Show loading state
      this.resetBtn.disabled = true;
      this.resetBtn.classList.add('loading');

      // Send reset request to API
      const response = await fetch('/api/v1/config/tv-display/reset', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to reset configuration');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'API returned error');
      }

      // Update current config
      this.currentConfig = result.data;

      // Repopulate form with default values
      this.populateForm(this.currentConfig);

      console.log('[Config] Configuration reset to defaults');
      this.showStatus('success', 'Configuration reset to defaults successfully!');

      // Remove loading state
      this.resetBtn.disabled = false;
      this.resetBtn.classList.remove('loading');

    } catch (error) {
      console.error('[Config] Error resetting configuration:', error);
      this.showStatus('error', `Failed to reset configuration: ${error.message}`);

      // Remove loading state
      this.resetBtn.disabled = false;
      this.resetBtn.classList.remove('loading');
    }
  }

  /**
   * Force refresh boat data from RevSport
   */
  async forceRefresh() {
    try {
      console.log('[Config] Forcing data refresh...');

      // Show loading state
      this.forceRefreshBtn.disabled = true;
      this.forceRefreshBtn.classList.add('loading');
      this.forceRefreshBtn.querySelector('span').textContent = 'Refreshing...';

      // Call API to force refresh
      const response = await fetch('/api/v1/bookings?refresh=true');

      if (!response.ok) {
        throw new Error('Failed to refresh boat data');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'API returned error');
      }

      const boatCount = result.data?.boats?.length || 0;
      console.log('[Config] Data refreshed successfully, boats:', boatCount);
      this.showStatus('success', `Data refreshed successfully! Found ${boatCount} boats. The TV display will update automatically.`);

      // Remove loading state
      this.forceRefreshBtn.disabled = false;
      this.forceRefreshBtn.classList.remove('loading');
      this.forceRefreshBtn.querySelector('span').textContent = 'Force Refresh Data';

    } catch (error) {
      console.error('[Config] Error forcing refresh:', error);
      this.showStatus('error', `Failed to refresh data: ${error.message}`);

      // Remove loading state
      this.forceRefreshBtn.disabled = false;
      this.forceRefreshBtn.classList.remove('loading');
      this.forceRefreshBtn.querySelector('span').textContent = 'Force Refresh Data';
    }
  }

  /**
   * Show status message
   */
  showStatus(type, message) {
    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message ${type}`;

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Auto-hide after 5 seconds
    setTimeout(() => {
      this.statusMessage.classList.add('hidden');
    }, 5000);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('[Config] DOM loaded, initializing controller...');
  new ConfigController();
});
