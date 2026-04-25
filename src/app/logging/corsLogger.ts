import { logger, errorLogger } from '../../shared/logger';

// Allowed origins for CORS
export const allowedOrigins: string[] = [
  'http://localhost:3000',
  'https://lmsdashboard.zeroproofdrive.org',
  'http://localhost:3001',
  'http://10.10.7.47:5001',
  'http://localhost:5174',
  'https://task-titans-admin-orcin.vercel.app',
  'http://localhost:5173',
  'http://localhost:5175',
  'https://task-titans-six.vercel.app',
  'https://task-titans-admin.vercel.app',
  'https://tier-elected-proc-cumulative.trycloudflare.com',
  'https://directory-supplements-adapter-designs.trycloudflare.com',
  // Add common development origins
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',
  'http://localhost:3002',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  // Local backend preview ports for static test pages
  'http://localhost:5000',
  'http://localhost:5001',
  'http://127.0.0.1:5000',
  'http://localhost:5173',
  'http://127.0.0.1:5001',
  'http://10.10.7.33:5001',
  'http://10.10.7.34:3000',
  'http://10.10.7.34:5173',
  'http://10.10.7.34:5174',
  'http://10.10.7.34:5175',
  'http://10.10.7.34:5176',
  'http://10.10.7.34:3001',
  'http://10.10.7.34:3002',
  'http://10.10.7.34:5001',
  'http://10.10.7.34',
  'https://10.10.7.34:3000',
  'https://10.10.7.34:5173',
  'https://10.10.7.34:5001',
  'https://10.10.7.34',
  // Dev server alternate ports
  'http://localhost:5003',
  'http://127.0.0.1:5003',
  'http://localhost:5005',
  'http://127.0.0.1:5005',
];

// Enable with env CORS_DEBUG=true or CORS_DEBUG=1
const getCorsDebug = (): boolean =>
  String(process.env.CORS_DEBUG || '').toLowerCase() === 'true' ||
  process.env.CORS_DEBUG === '1';

const corsLogMap = new Map<string, number>();
const CORS_LOG_WINDOW_MS = 60_000; // log at most once per origin per minute

export const isOriginAllowed = (origin?: string): boolean => {
  if (!origin) return true; // allow non-browser clients (Postman/mobile)
  if (allowedOrigins.includes(origin)) return true;

  // Allow local network origins in development (10.x.x.x, 192.168.x.x, 172.x.x.x)
  if (process.env.NODE_ENV === 'development') {
    if (
      origin.startsWith('http://10.') ||
      origin.startsWith('https://10.') ||
      origin.startsWith('http://192.168.') ||
      origin.startsWith('https://192.168.') ||
      origin.startsWith('http://172.') ||
      origin.startsWith('https://172.')
    ) {
      return true;
    }
  }

  return false;
};

// Rate-limited CORS decision logging
export const maybeLogCors = (
  origin: string | undefined,
  allowed: boolean,
): void => {
  if (!getCorsDebug()) return;
  const key = origin || 'no-origin';
  const now = Date.now();
  const last = corsLogMap.get(key) || 0;
  if (now - last < CORS_LOG_WINDOW_MS) return;
  corsLogMap.set(key, now);
  if (!origin) {
    logger.info(
      'CORS allow: request without Origin header (Postman/mobile/native)',
    );
    return;
  }
  if (allowed) logger.info(`CORS allow: ${origin}`);
  else errorLogger.warn(`CORS block: ${origin}`);
};
