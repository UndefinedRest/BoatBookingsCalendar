"use strict";
/**
 * Frontend Application
 * Booking Calendar Display with Auto-refresh
 */
class BookingCalendarApp {
    constructor() {
        this.config = null;
        this.refreshTimer = null;
        this.nextRefreshTimer = null;
        this.nextRefreshTime = null;
        this.init();
    }
    /**
     * Initialize application
     */
    async init() {
        try {
            // Load configuration
            await this.loadConfig();
            // Load initial booking data
            await this.loadBookings();
            // Start auto-refresh
            this.startAutoRefresh();
        }
        catch (error) {
            console.error('Failed to initialize app:', error);
            this.showError('Failed to initialize application');
        }
    }
    /**
     * Load club configuration
     */
    async loadConfig() {
        const response = await fetch('/api/v1/config');
        if (!response.ok) {
            throw new Error('Failed to load configuration');
        }
        const result = await response.json();
        this.config = result.data;
        // Apply branding
        this.applyBranding();
    }
    /**
     * Apply club branding
     */
    applyBranding() {
        if (!this.config)
            return;
        const root = document.documentElement;
        root.style.setProperty('--primary-color', this.config.club.branding.primaryColor);
        root.style.setProperty('--secondary-color', this.config.club.branding.secondaryColor);
        // Set club name
        const clubNameEl = document.getElementById('clubName');
        if (clubNameEl) {
            clubNameEl.textContent = `${this.config.club.name} - Booking Calendar`;
        }
        // Set session times in legend
        const session1El = document.getElementById('session1Time');
        if (session1El) {
            session1El.textContent = `Morning Session 1 (${this.config.club.sessions.morning1.start} - ${this.config.club.sessions.morning1.end})`;
        }
        const session2El = document.getElementById('session2Time');
        if (session2El) {
            session2El.textContent = `Morning Session 2 (${this.config.club.sessions.morning2.start} - ${this.config.club.sessions.morning2.end})`;
        }
    }
    /**
     * Load booking data from API
     */
    async loadBookings() {
        try {
            this.showLoading();
            const response = await fetch('/api/v1/bookings');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const result = await response.json();
            const data = result.data;
            this.renderCalendar(data);
            this.showMain();
            this.updateLastUpdated();
        }
        catch (error) {
            console.error('Failed to load bookings:', error);
            this.showError(error instanceof Error ? error.message : 'Unknown error');
        }
    }
    /**
     * Render calendar table
     */
    renderCalendar(data) {
        // Update summary
        this.updateSummary(data);
        // Generate 7 days starting from today
        const days = this.generateWeekDays();
        // Render header
        this.renderHeader(days);
        // Group boats
        const grouped = this.groupBoats(data.boats);
        // Render body
        this.renderBody(grouped, days);
    }
    /**
     * Update summary section
     */
    updateSummary(data) {
        const totalBoatsEl = document.getElementById('totalBoats');
        const totalBookingsEl = document.getElementById('totalBookings');
        const dateRangeEl = document.getElementById('dateRange');
        if (totalBoatsEl)
            totalBoatsEl.textContent = data.metadata.totalBoats.toString();
        if (totalBookingsEl)
            totalBookingsEl.textContent = data.metadata.totalBookings.toString();
        if (dateRangeEl) {
            const start = new Date(data.metadata.weekStart);
            const end = new Date(data.metadata.weekEnd);
            dateRangeEl.textContent = `${this.formatDate(start)} - ${this.formatDate(end)}`;
        }
    }
    /**
     * Generate array of 7 days starting from today
     */
    generateWeekDays() {
        const days = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        for (let i = 0; i < 7; i++) {
            const day = new Date(today);
            day.setDate(today.getDate() + i);
            days.push(day);
        }
        return days;
    }
    /**
     * Render table header
     */
    renderHeader(days) {
        const headerRow = document.getElementById('calendarHeader');
        if (!headerRow)
            return;
        // Clear existing header (keep boat column)
        while (headerRow.children.length > 1) {
            headerRow.removeChild(headerRow.lastChild);
        }
        // Add day columns
        days.forEach((day, index) => {
            const th = document.createElement('th');
            th.className = 'day-column';
            th.innerHTML = `
        <div>${this.getDayName(day)}</div>
        <div style="font-weight: 400; font-size: 0.875em">${this.formatShortDate(day)}</div>
      `;
            if (index === 0) {
                th.style.fontWeight = '700';
                th.style.background = this.config?.club.branding.secondaryColor || '#0ea5e9';
            }
            headerRow.appendChild(th);
        });
    }
    /**
     * Group boats by type
     */
    groupBoats(boats) {
        const grouped = {
            quads: [],
            doubles: [],
            singles: [],
            other: [],
        };
        boats.forEach(boat => {
            const type = boat.type.toUpperCase();
            if (type.includes('1X')) {
                grouped.singles.push(boat);
            }
            else if (type.includes('2X') || type.includes('2-')) {
                grouped.doubles.push(boat);
            }
            else if (type.includes('4X') || type.includes('4+') || type.includes('4-') || type.includes('8')) {
                grouped.quads.push(boat);
            }
            else {
                grouped.other.push(boat);
            }
        });
        return grouped;
    }
    /**
     * Render table body with grouped boats
     */
    renderBody(grouped, days) {
        const tbody = document.getElementById('calendarBody');
        if (!tbody)
            return;
        tbody.innerHTML = '';
        // Render groups in order: Quads → Doubles → Singles → Other
        const groups = [
            { name: 'Quads & Fours', boats: grouped.quads },
            { name: 'Doubles', boats: grouped.doubles },
            { name: 'Singles', boats: grouped.singles },
        ];
        if (grouped.other.length > 0) {
            groups.push({ name: 'Other', boats: grouped.other });
        }
        groups.forEach((group, groupIndex) => {
            if (group.boats.length === 0)
                return;
            // Group header
            const headerRow = document.createElement('tr');
            headerRow.className = 'group-header';
            const headerCell = document.createElement('td');
            headerCell.colSpan = days.length + 1;
            headerCell.textContent = group.name;
            headerRow.appendChild(headerCell);
            tbody.appendChild(headerRow);
            // Boat rows
            group.boats.forEach(boat => {
                const row = document.createElement('tr');
                if (groupIndex > 0) {
                    row.className = 'group-separator';
                }
                // Boat name cell
                const nameCell = document.createElement('td');
                nameCell.className = 'boat-name';
                nameCell.textContent = boat.displayName;
                row.appendChild(nameCell);
                // Day cells
                days.forEach(day => {
                    const cell = document.createElement('td');
                    cell.className = 'day-cell';
                    const bookingsForDay = this.getBookingsForDay(boat.bookings, day);
                    if (bookingsForDay.length > 0) {
                        bookingsForDay.forEach(booking => {
                            const bookingDiv = this.createBookingElement(booking);
                            cell.appendChild(bookingDiv);
                        });
                    }
                    else {
                        const emptyDiv = document.createElement('div');
                        emptyDiv.className = 'empty-cell';
                        emptyDiv.textContent = '—';
                        cell.appendChild(emptyDiv);
                    }
                    row.appendChild(cell);
                });
                tbody.appendChild(row);
            });
        });
    }
    /**
     * Get bookings for a specific day
     */
    getBookingsForDay(bookings, day) {
        const dayStr = this.formatISODate(day);
        return bookings.filter(b => b.date.startsWith(dayStr));
    }
    /**
     * Create booking element
     */
    createBookingElement(booking) {
        const div = document.createElement('div');
        // Determine session class
        const isSession2 = this.config &&
            booking.startTime >= this.config.club.sessions.morning2.start;
        div.className = isSession2 ? 'booking session-2' : 'booking session-1';
        div.innerHTML = `
      <span class="booking-time">${booking.startTime}</span>
      <span class="booking-member">${booking.memberName}</span>
    `;
        return div;
    }
    /**
     * Start auto-refresh timer
     */
    startAutoRefresh() {
        if (!this.config)
            return;
        const interval = this.config.refreshInterval;
        // Set next refresh time
        this.nextRefreshTime = new Date(Date.now() + interval);
        this.updateNextRefresh();
        // Update countdown every second
        this.nextRefreshTimer = window.setInterval(() => {
            this.updateNextRefresh();
        }, 1000);
        // Refresh data
        this.refreshTimer = window.setInterval(() => {
            console.log('Auto-refreshing booking data...');
            this.loadBookings();
            this.nextRefreshTime = new Date(Date.now() + interval);
        }, interval);
    }
    /**
     * Update next refresh countdown
     */
    updateNextRefresh() {
        const el = document.getElementById('nextRefresh');
        if (!el || !this.nextRefreshTime)
            return;
        const now = Date.now();
        const diff = this.nextRefreshTime.getTime() - now;
        if (diff <= 0) {
            el.textContent = 'Refreshing...';
            return;
        }
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        el.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    /**
     * Update last updated time
     */
    updateLastUpdated() {
        const el = document.getElementById('lastUpdated');
        if (el) {
            const now = new Date();
            el.textContent = `Last updated: ${now.toLocaleTimeString()}`;
        }
    }
    /**
     * Show loading state
     */
    showLoading() {
        document.getElementById('loading')?.classList.remove('hidden');
        document.getElementById('main')?.classList.add('hidden');
        document.getElementById('error')?.classList.add('hidden');
    }
    /**
     * Show main content
     */
    showMain() {
        document.getElementById('loading')?.classList.add('hidden');
        document.getElementById('main')?.classList.remove('hidden');
        document.getElementById('error')?.classList.add('hidden');
    }
    /**
     * Show error state
     */
    showError(message) {
        document.getElementById('loading')?.classList.add('hidden');
        document.getElementById('main')?.classList.add('hidden');
        document.getElementById('error')?.classList.remove('hidden');
        const errorEl = document.getElementById('errorMessage');
        if (errorEl) {
            errorEl.textContent = message;
        }
    }
    /**
     * Format helpers
     */
    formatDate(date) {
        return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    formatShortDate(date) {
        return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
    }
    formatISODate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    getDayName(date) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[date.getDay()];
    }
}
// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.app = new BookingCalendarApp();
    });
}
else {
    window.app = new BookingCalendarApp();
}
