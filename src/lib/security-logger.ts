import fs from 'fs';
import path from 'path';

/**
 * Sanitizes URLs, credentials, and sensitive tokens from log messages
 */
export function sanitizeLogString(str: string): string {
  if (!str || typeof str !== 'string') return '';
  return str
    // Redact password in postgresql://user:password@host
    .replace(/(postgres(?:ql)?:\/\/[^:]+:)([^@]+)(@)/gi, '$1[REDACTED_PASSWORD]$3')
    // Redact token values
    .replace(/bearer\s+[a-zA-Z0-9_\-\.]+/gi, 'Bearer [REDACTED_TOKEN]')
    .replace(/key=[a-zA-Z0-9_\-]+/gi, 'key=[REDACTED_KEY]')
    .replace(/password[:=]\s*["']?[^"'&\s]+["']?/gi, 'password=[REDACTED]');
}

export interface SecurityEvent {
  type:
    | 'BLOCKED_PRODUCTION_WRITE'
    | 'BLOCKED_PRODUCTION_TEST'
    | 'BLOCKED_PRODUCTION_SEED'
    | 'UNAUTHORIZED_MUTATION'
    | 'UNAUTHORIZED_ACCESS_ATTEMPT'
    | 'AUTHORIZED_DATABASE_RESET';
  message: string;
  databaseHost?: string;
  environment?: string;
  source?: string;
  details?: Record<string, any>;
}

export function logSecurityEvent(event: SecurityEvent) {
  const timestamp = new Date().toISOString();
  const sanitizedHost = event.databaseHost ? sanitizeLogString(event.databaseHost) : undefined;
  const sanitizedMessage = sanitizeLogString(event.message);

  const logEntry = {
    timestamp,
    type: event.type,
    message: sanitizedMessage,
    environment: event.environment || process.env.NODE_ENV || 'unknown',
    databaseHost: sanitizedHost,
    source: event.source || 'application',
    details: event.details ? JSON.parse(sanitizeLogString(JSON.stringify(event.details))) : undefined,
  };

  const line = `[SECURITY AUDIT] ${timestamp} [${event.type}] ${sanitizedMessage} ${sanitizedHost ? `(Host: ${sanitizedHost})` : ''}\n`;
  console.error(line.trim());

  // Optionally persist to local logs directory if writable
  try {
    const logsDir = path.join(process.cwd(), 'prisma', 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    const logFile = path.join(logsDir, 'security-audit.log');
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
  } catch {
    // Non-fatal if filesystem is read-only
  }
}
