/**
 * Authentication service for RevSport
 * Based on the working prototype auth implementation
 */

import axios, { type AxiosInstance } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import * as cheerio from 'cheerio';
import { Logger } from '../utils/logger.js';
import type { Config } from '../models/types.js';

export class AuthService {
  private client: AxiosInstance;
  private cookieJar: CookieJar;
  private isAuthenticated: boolean = false;
  private csrfToken: string | null = null;
  private logger: Logger;

  constructor(private config: Config) {
    this.logger = new Logger('AuthService', config.debug);
    this.cookieJar = new CookieJar();

    this.client = wrapper(
      axios.create({
        baseURL: config.baseUrl,
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
        },
      })
    );
  }

  /**
   * Perform complete login workflow
   */
  async login(): Promise<void> {
    this.logger.info('🔐 Starting authentication...');

    // Step 1: Fetch login page and extract CSRF token
    await this.fetchLoginPage();
    this.logger.success('CSRF token extracted');

    // Step 2: Submit login credentials
    await this.submitLogin();
    this.logger.success('Login submitted');

    // Step 3: Verify authentication
    await this.delay(1000); // Small delay for session to establish
    await this.verifyAuthentication();
    this.logger.success('Authentication successful');
  }

  /**
   * Get the authenticated HTTP client
   */
  getClient(): AxiosInstance {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated. Call login() first.');
    }
    return this.client;
  }

  /**
   * Check if currently authenticated
   */
  isLoggedIn(): boolean {
    return this.isAuthenticated;
  }

  /**
   * Step 1: Fetch login page and extract CSRF token
   */
  private async fetchLoginPage(): Promise<void> {
    try {
      this.logger.debug('Fetching login page...');

      const response = await this.client.get('/login');
      const $ = cheerio.load(response.data);

      // Extract CSRF token - try multiple selectors
      this.csrfToken =
        $('input[name="_token"]').val() as string ||
        $('meta[name="csrf-token"]').attr('content') ||
        $('meta[name="X-CSRF-TOKEN"]').attr('content') ||
        null;

      if (!this.csrfToken) {
        throw new Error('Could not extract CSRF token from login page');
      }

      this.logger.debug('CSRF token found', {
        token: this.csrfToken.substring(0, 10) + '...',
      });
    } catch (error) {
      this.logger.error('Failed to fetch login page', error);
      throw new Error(`Failed to fetch login page: ${(error as Error).message}`);
    }
  }

  /**
   * Step 2: Submit login credentials
   */
  private async submitLogin(): Promise<void> {
    try {
      this.logger.debug('Submitting login credentials...');

      const loginData = new URLSearchParams({
        _token: this.csrfToken!,
        username: this.config.username,
        password: this.config.password,
        remember: 'on',
      });

      const response = await this.client.post('/login', loginData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': `${this.config.baseUrl}/login`,
          'Origin': this.config.baseUrl,
        },
        validateStatus: (status) => true, // Accept all status codes
      });

      const cookieCount = this.cookieJar.getCookiesSync(this.config.baseUrl).length;

      this.logger.debug('Login response received', {
        status: response.status,
        cookies: cookieCount,
      });

      // RevSport sometimes returns 500 but still sets cookies and auth works
      // So we'll let verification step determine if auth actually succeeded
      if (response.status >= 400) {
        this.logger.debug('Non-200 response, but will proceed to verification');
        this.logger.debug('Error response data type:', typeof response.data);

        // Check if we got cookies despite error status
        if (cookieCount === 0) {
          // No cookies = real failure
          if (typeof response.data === 'string') {
            const $ = cheerio.load(response.data);
            const errorMsg =
              $('.alert-danger').text().trim() || $('.error').text().trim();

            throw new Error(errorMsg || `Login failed with status ${response.status}`);
          } else {
            throw new Error(
              `Login failed with status ${response.status}: ${JSON.stringify(response.data)}`
            );
          }
        }
      }
    } catch (error) {
      this.logger.error('Login submission failed', error);
      throw new Error(`Login submission failed: ${(error as Error).message}`);
    }
  }

  /**
   * Step 3: Verify authentication was successful
   */
  private async verifyAuthentication(): Promise<void> {
    try {
      this.logger.debug('Verifying authentication...');

      const response = await this.client.get('/bookings');
      const $ = cheerio.load(response.data);

      const hasLogoutButton =
        $('a[href*="logout"]').length > 0 || $('form[action*="logout"]').length > 0;
      const hasLoginForm =
        $('form[action*="login"]').length > 0 || $('input[name="password"]').length > 0;

      this.isAuthenticated = hasLogoutButton && !hasLoginForm;

      this.logger.debug('Authentication verification', {
        hasLogoutButton,
        hasLoginForm,
        isAuthenticated: this.isAuthenticated,
      });

      if (!this.isAuthenticated) {
        throw new Error('Authentication verification failed');
      }
    } catch (error) {
      this.logger.error('Authentication verification failed', error);
      throw new Error(`Authentication verification failed: ${(error as Error).message}`);
    }
  }

  /**
   * Make authenticated GET request with auto-retry on session expiry
   */
  async get<T = any>(url: string): Promise<T> {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated. Call login() first.');
    }

    try {
      const response = await this.client.get(url);
      return response.data;
    } catch (error: any) {
      // Check if session expired
      if (error.response?.status === 401 || error.response?.status === 403) {
        this.logger.warn('Session expired, re-authenticating...');
        this.isAuthenticated = false;
        await this.login();
        // Retry request
        const response = await this.client.get(url);
        return response.data;
      }
      throw error;
    }
  }

  /**
   * Delay utility
   */
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
