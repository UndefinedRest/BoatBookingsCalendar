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
      // Serialize error details for better logging
      if (error instanceof Error) {
        console.error(`  Error name: ${error.name}`);
        console.error(`  Error message: ${error.message}`);
        if (error.stack) {
          console.error(`  Stack trace: ${error.stack}`);
        }
        // Handle Zod errors specifically
        if ('issues' in error) {
          console.error(`  Validation issues: ${JSON.stringify((error as any).issues, null, 2)}`);
        }
        // Handle Node.js system errors (EACCES, ENOENT, etc.)
        if ('code' in error) {
          console.error(`  Error code: ${(error as NodeJS.ErrnoException).code}`);
        }
        if ('path' in error) {
          console.error(`  Path: ${(error as NodeJS.ErrnoException).path}`);
        }
        if ('syscall' in error) {
          console.error(`  Syscall: ${(error as NodeJS.ErrnoException).syscall}`);
        }
      } else {
        console.error(error);
      }
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
