/**
 * RevolutioniseSport Robust Login Method
 * 
 * This module provides authenticated access to RevSport sites
 * Based on analysis of Lake Macquarie Rowing Club's implementation
 */

const axios = require('axios');
const cheerio = require('cheerio');
const tough = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');

class RevSportAuthenticator {
    constructor(config) {
        this.baseUrl = config.baseUrl;
        this.username = config.username;
        this.password = config.password;
        this.debug = config.debug || false;
        
        // Create cookie jar for persistent session
        this.cookieJar = new tough.CookieJar();
        
        // Configure axios with cookie support
        this.client = wrapper(axios.create({
            baseURL: this.baseUrl,
            jar: this.cookieJar,
            withCredentials: true,
            maxRedirects: 5,
            validateStatus: (status) => status >= 200 && status < 400,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
        }));
        
        this.isAuthenticated = false;
        this.csrfToken = null;
    }

    /**
     * Log debug information if debug mode is enabled
     */
    log(message, data = null) {
        if (this.debug) {
            console.log(`[RevSportAuth] ${message}`);
            if (data) {
                console.log(JSON.stringify(data, null, 2));
            }
        }
    }

    /**
     * Step 1: Fetch the login page and extract CSRF token
     */
    async fetchLoginPage() {
        try {
            this.log('Fetching login page...');
            
            const response = await this.client.get('/login');
            const $ = cheerio.load(response.data);
            
            // Extract CSRF token - try multiple possible selectors
            let csrfToken = null;
            
            // Method 1: Look for _token input field (Laravel standard)
            csrfToken = $('input[name="_token"]').val();
            
            // Method 2: Look for csrf-token meta tag
            if (!csrfToken) {
                csrfToken = $('meta[name="csrf-token"]').attr('content');
            }
            
            // Method 3: Look for X-CSRF-TOKEN meta tag
            if (!csrfToken) {
                csrfToken = $('meta[name="X-CSRF-TOKEN"]').attr('content');
            }
            
            if (!csrfToken) {
                throw new Error('Could not extract CSRF token from login page');
            }
            
            this.csrfToken = csrfToken;
            this.log('CSRF token extracted', { token: csrfToken.substring(0, 10) + '...' });
            
            // Extract form action URL (in case it's not /login)
            const formAction = $('form[method="POST"]').attr('action') || 
                              $('form[method="post"]').attr('action') ||
                              '/login';
            
            // Analyze form fields for debugging
            const formFields = [];
            $('form input').each((i, el) => {
                const $el = $(el);
                formFields.push({
                    name: $el.attr('name'),
                    type: $el.attr('type'),
                    id: $el.attr('id'),
                    placeholder: $el.attr('placeholder')
                });
            });
            
            this.log('Login form analysis', { 
                action: formAction,
                fields: formFields 
            });
            
            return {
                csrfToken,
                formAction,
                formFields
            };
            
        } catch (error) {
            this.log('Error fetching login page', { error: error.message });
            throw new Error(`Failed to fetch login page: ${error.message}`);
        }
    }

    /**
     * Step 2: Submit login credentials
     */
    async submitLogin(loginPageData) {
        try {
            this.log('Submitting login credentials...');
            
            const { formAction, formFields } = loginPageData;
            
            // Determine correct field names from form analysis
            const emailField = this.findFieldName(formFields, ['email', 'username', 'user']);
            const passwordField = this.findFieldName(formFields, ['password', 'pass', 'pwd']);
            
            if (!emailField || !passwordField) {
                throw new Error('Could not determine login field names. Form fields: ' + 
                    JSON.stringify(formFields));
            }
            
            this.log('Using field names', { emailField, passwordField });
            
            // Prepare login payload
            const loginData = new URLSearchParams({
                _token: this.csrfToken,
                [emailField]: this.username,
                [passwordField]: this.password,
                remember: 'on' // Try to maintain session longer
            });
            
            this.log('Login payload', {
                fields: Object.fromEntries(loginData),
                endpoint: formAction
            });
            
            // Submit login form
            const response = await this.client.post(formAction, loginData, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Referer': `${this.baseUrl}/login`,
                    'Origin': this.baseUrl
                },
                validateStatus: (status) => true // Accept all status codes
            });
            
            this.log('Login response received', {
                status: response.status,
                statusText: response.statusText,
                redirected: response.request?.res?.responseUrl !== `${this.baseUrl}${formAction}`,
                cookies: this.cookieJar.getCookiesSync(this.baseUrl).length,
                responseLength: response.data?.length
            });
            
            // Log response if error
            if (response.status >= 400) {
                this.log('ERROR RESPONSE BODY', {
                    body: response.data?.substring(0, 500) // First 500 chars
                });
            }
            
            // Check for error messages in response
            if (response.status >= 400 && response.data) {
                const $ = cheerio.load(response.data);
                const errorMsg = $('.alert-danger').text().trim() ||
                               $('.error').text().trim() ||
                               $('[class*="error"]').text().trim();
                
                if (errorMsg) {
                    this.log('Error message from page', { errorMsg });
                }
            }
            
            return response;
            
        } catch (error) {
            this.log('Error submitting login', { error: error.message, stack: error.stack });
            throw new Error(`Login submission failed: ${error.message}`);
        }
    }

    /**
     * Step 3: Verify authentication was successful
     */
    async verifyAuthentication() {
        try {
            this.log('Verifying authentication...');
            
            // Try to access a page that requires authentication
            const response = await this.client.get('/bookings');
            const $ = cheerio.load(response.data);
            
            // Check for indicators of successful authentication
            const hasLogoutButton = $('a[href*="logout"]').length > 0 ||
                                   $('form[action*="logout"]').length > 0;
            
            const hasLoginForm = $('form[action*="login"]').length > 0 ||
                                $('input[name="password"]').length > 0;
            
            // Check for welcome message
            const welcomeText = $('body').text();
            const hasWelcome = /Hi,\s*\w+/i.test(welcomeText) || 
                              /Welcome,\s*\w+/i.test(welcomeText) ||
                              /Account/i.test(welcomeText);
            
            this.isAuthenticated = hasLogoutButton && !hasLoginForm;
            
            this.log('Authentication verification', {
                hasLogoutButton,
                hasLoginForm,
                hasWelcome,
                isAuthenticated: this.isAuthenticated
            });
            
            if (!this.isAuthenticated) {
                // Try to extract error message
                const errorMsg = $('.alert-danger').text().trim() ||
                               $('.error').text().trim() ||
                               $('[class*="error"]').text().trim();
                
                if (errorMsg) {
                    throw new Error(`Authentication failed: ${errorMsg}`);
                }
                
                throw new Error('Authentication verification failed - no clear authentication indicators found');
            }
            
            return this.isAuthenticated;
            
        } catch (error) {
            this.log('Error verifying authentication', { error: error.message });
            throw new Error(`Authentication verification failed: ${error.message}`);
        }
    }

    /**
     * Main login workflow
     */
    async login() {
        try {
            console.log('🔐 Starting RevSport authentication...');
            
            // Step 1: Fetch login page and CSRF token
            const loginPageData = await this.fetchLoginPage();
            console.log('✓ Login page fetched, CSRF token extracted');
            
            // Step 2: Submit credentials
            await this.submitLogin(loginPageData);
            console.log('✓ Login credentials submitted');
            
            // Small delay to allow session to establish
            await this.delay(1000);
            
            // Step 3: Verify authentication
            await this.verifyAuthentication();
            console.log('✓ Authentication successful');
            
            return true;
            
        } catch (error) {
            console.error('❌ Authentication failed:', error.message);
            this.isAuthenticated = false;
            throw error;
        }
    }

    /**
     * Make authenticated request
     */
    async get(url) {
        if (!this.isAuthenticated) {
            throw new Error('Not authenticated. Call login() first.');
        }
        
        try {
            const response = await this.client.get(url);
            return response.data;
        } catch (error) {
            // Check if session expired
            if (error.response?.status === 401 || error.response?.status === 403) {
                this.log('Session may have expired, re-authenticating...');
                await this.login();
                // Retry request
                const response = await this.client.get(url);
                return response.data;
            }
            throw error;
        }
    }

    /**
     * Helper: Find field name from form fields
     */
    findFieldName(formFields, possibleNames) {
        for (const field of formFields) {
            const fieldName = (field.name || '').toLowerCase();
            const fieldId = (field.id || '').toLowerCase();
            const fieldPlaceholder = (field.placeholder || '').toLowerCase();
            
            for (const possible of possibleNames) {
                if (fieldName.includes(possible) || 
                    fieldId.includes(possible) ||
                    fieldPlaceholder.includes(possible)) {
                    return field.name;
                }
            }
        }
        return null;
    }

    /**
     * Helper: Delay utility
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get current session cookies
     */
    getCookies() {
        return this.cookieJar.getCookiesSync(this.baseUrl);
    }

    /**
     * Check if currently authenticated
     */
    isLoggedIn() {
        return this.isAuthenticated;
    }
}

/**
 * USAGE EXAMPLE
 */
async function testLogin() {
    // Load credentials from environment
    require('dotenv').config();
    
    const auth = new RevSportAuthenticator({
        baseUrl: process.env.REVSPORT_BASE_URL || 'https://www.lakemacquarierowingclub.org.au',
        username: process.env.REVSPORT_USERNAME,
        password: process.env.REVSPORT_PASSWORD,
        debug: true // Enable detailed logging
    });

    try {
        // Perform login
        await auth.login();
        
        // Test authenticated request
        const bookingsHtml = await auth.get('/bookings');
        console.log('\n✓ Successfully fetched bookings page');
        console.log(`  Page length: ${bookingsHtml.length} characters`);
        
        // Show cookies
        const cookies = auth.getCookies();
        console.log(`\n✓ Active cookies: ${cookies.length}`);
        cookies.forEach(cookie => {
            console.log(`  - ${cookie.key}: ${cookie.value.substring(0, 20)}...`);
        });
        
        return auth;
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        process.exit(1);
    }
}

// Export for use in other modules
module.exports = RevSportAuthenticator;

// Run test if executed directly
if (require.main === module) {
    testLogin().then(() => {
        console.log('\n✓ All tests passed!');
        process.exit(0);
    });
}