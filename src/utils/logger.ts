/**
 * Simple structured logger
 */

export class Logger {
  private context: string;
  private debugEnabled: boolean;

  constructor(context: string, debug: boolean = false) {
    this.context = context;
    this.debugEnabled = debug;
  }

  info(message: string, data?: any) {
    console.log(`[${this.context}] ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  debug(message: string, data?: any) {
    if (this.debugEnabled) {
      console.log(`[${this.context}] DEBUG: ${message}`);
      if (data) {
        console.log(JSON.stringify(data, null, 2));
      }
    }
  }

  error(message: string, error?: any) {
    console.error(`[${this.context}] ❌ ${message}`);
    if (error) {
      console.error(error);
    }
  }

  success(message: string) {
    console.log(`[${this.context}] ✓ ${message}`);
  }

  warn(message: string, data?: any) {
    console.warn(`[${this.context}] ⚠ ${message}`);
    if (data) {
      console.warn(data);
    }
  }
}
