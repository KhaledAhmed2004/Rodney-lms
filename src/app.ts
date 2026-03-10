import cors from 'cors';
import YAML from 'yamljs';

/**
 * ⚠️ CRITICAL IMPORT ORDER - DO NOT REORDER ⚠️
 *
 * The order below is carefully designed to prevent subtle bugs.
 * Changing this order can break auto-labeling, metrics, or cause runtime errors.
 *
 * Why this order matters:
 * 1. mongooseMetrics must load BEFORE any models compile (plugins must register first)
 * 2. autoLabelBootstrap must load BEFORE routes import controllers/services
 * 3. opentelemetry should load early for proper instrumentation
 * 4. Third-party patches (bcrypt, JWT) must load before their usage
 * 5. Routes load LAST (they import controllers which need auto-labeling ready)
 *
 * See loadOrderValidator.ts for runtime validation.
 */

// FIRST: Mongoose metrics plugin (BEFORE any models compile)
import './app/logging/mongooseMetrics';
// SECOND: Auto-labeling system (BEFORE routes import controllers)
import './app/logging/autoLabelBootstrap';
// THIRD: OpenTelemetry instrumentation
import './app/logging/opentelemetry';
// FOURTH: Third-party library patches
import './app/logging/patchBcrypt';
import './app/logging/patchJWT';
// LAST: Routes (imports controllers/services - auto-labeling must be ready)
import router from './routes';
import { Morgan } from './shared/morgen';
import swaggerUi from 'swagger-ui-express';
import { StatusCodes } from 'http-status-codes';
import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import globalErrorHandler from './app/middlewares/globalErrorHandler';
import { requestContextInit } from './app/logging/requestContext';
import { clientInfo } from './app/logging/clientInfo';
import { requestLogger } from './app/logging/requestLogger';
import { otelExpressMiddleware } from './app/logging/otelExpress';
import path from 'path';
import { logger, errorLogger } from './shared/logger';
import { allowedOrigins, maybeLogCors } from './app/logging/corsLogger';
// autoLabelBootstrap moved above router import to ensure controllers are wrapped before route binding

const app = express();

// Morgan logging
app.use(Morgan.successHandler);
app.use(Morgan.errorHandler);

// Client Hints: request OS/device info from browsers without frontend changes
app.use((req, res, next) => {
  // Ask for high-entropy client hints (Chrome/Edge)
  res.setHeader(
    'Accept-CH',
    [
      'Sec-CH-UA',
      'Sec-CH-UA-Platform',
      'Sec-CH-UA-Platform-Version',
      'Sec-CH-UA-Mobile',
      'Sec-CH-UA-Model',
      'Sec-CH-UA-Arch',
      'Sec-CH-UA-Bitness',
    ].join(', '),
  );

  // Vary to keep caches/proxies from mixing responses across devices
  const varyHeaders = [
    'User-Agent',
    'Sec-CH-UA',
    'Sec-CH-UA-Platform',
    'Sec-CH-UA-Platform-Version',
    'Sec-CH-UA-Mobile',
    'Sec-CH-UA-Model',
    'Sec-CH-UA-Arch',
    'Sec-CH-UA-Bitness',
  ].join(', ');
  const existingVary = res.getHeader('Vary');
  res.setHeader(
    'Vary',
    existingVary ? String(existingVary) + ', ' + varyHeaders : varyHeaders,
  );

  // Encourage first-request delivery (Chrome only)
  res.setHeader(
    'Critical-CH',
    [
      'Sec-CH-UA-Platform',
      'Sec-CH-UA-Platform-Version',
      'Sec-CH-UA-Mobile',
      'Sec-CH-UA-Model',
    ].join(', '),
  );

  next();
});

// OpenTelemetry middleware for timeline spans
app.use(otelExpressMiddleware);

// CORS setup moved to logging/corsLogger.ts (allowedOrigins, maybeLogCors)

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, Postman)
      if (!origin) {
        maybeLogCors(origin, true);
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        maybeLogCors(origin, true);
        callback(null, true);
      } else {
        maybeLogCors(origin, false);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true, // allow cookies/auth headers
  }),
);

// Explicitly handle preflight OPTIONS requests
app.options(
  '*',
  cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  }),
);

// Body parser
app.use(express.json());

app.use(express.urlencoded({ extended: true }));

// Cookie parser (for reading refresh tokens from cookies)
app.use(cookieParser());

// Request/Response logging
// Initialize request-scoped context BEFORE logging
app.use(requestContextInit);
// Detect device/OS/browser from headers (Client Hints + UA fallback)
app.use(clientInfo);
app.use(requestLogger);

// Static files
app.use(express.static('uploads'));
app.use('/uploads', express.static('uploads'));
app.use(express.static('public'));

// Swagger
const swaggerDocument = YAML.load(
  path.join(__dirname, '../public/swagger.yaml'),
);
app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// API routes
app.use('/api/v1', router);

// Live response
app.get('/', (req: Request, res: Response) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Matrix Live Server</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          overflow: hidden;
          background: black;
          font-family: monospace;
        }
        canvas {
          display: block;
        }
        .center-container {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          color: #00ff00;
        }
        .server-message {
          font-size: 3rem;
          font-weight: bold;
          text-shadow: 0 0 10px #00ff00, 0 0 20px #00ff00, 0 0 40px #00ff00;
          animation: glow 1.5s infinite alternate;
        }
        .date-time {
          margin-top: 15px;
          font-size: 1.2rem;
          text-shadow: 0 0 5px #00ff00, 0 0 15px #00ff00;
          animation: flicker 1.5s infinite;
        }
        @keyframes glow {
          from { text-shadow: 0 0 5px #00ff00, 0 0 10px #00ff00; }
          to { text-shadow: 0 0 20px #00ff00, 0 0 40px #00ff00, 0 0 60px #00ff00; }
        }
        @keyframes flicker {
          0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% { opacity: 1; }
          20%, 22%, 24%, 55% { opacity: 0.3; }
        }
      </style>
    </head>
    <body>
      <canvas id="matrixCanvas"></canvas>
      <div class="center-container">
        <div class="server-message">✅ Server is Live 🚀</div>
        <div class="date-time" id="dateTime"></div>
      </div>

      <script>
        const canvas = document.getElementById("matrixCanvas");
        const ctx = canvas.getContext("2d");

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("");
        const fontSize = 18;
        const columns = Math.floor(canvas.width / fontSize);
        const drops = Array(columns).fill(1);

        function draw() {
          ctx.fillStyle = "rgba(0,0,0,0.05)";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          ctx.fillStyle = "#0F0";
          ctx.font = fontSize + "px monospace";

          for (let i = 0; i < drops.length; i++) {
            const text = letters[Math.floor(Math.random() * letters.length)];
            ctx.fillText(text, i * fontSize, drops[i] * fontSize);
            drops[i]++;
            if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
              drops[i] = 0;
            }
          }
        }

        setInterval(draw, 33);

        // Live date & time
        function updateDateTime() {
          const now = new Date();
          document.getElementById("dateTime").textContent = now.toLocaleString();
        }
        setInterval(updateDateTime, 1000);
        updateDateTime();

        window.addEventListener("resize", () => {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
        });
      </script>
    </body>
    </html>
  `);
});

// Global error handler
app.use(globalErrorHandler);

// 404 handler
app.use((req, res) => {
  res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    message: 'Not found',
    errorMessages: [
      {
        path: req.originalUrl,
        message: "API DOESN'T EXIST",
      },
    ],
  });
});

export default app;
