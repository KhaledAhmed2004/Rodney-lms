// Skip entire module in test environment to avoid ESM/CJS conflicts with vitest
const isTestEnv = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';

import { setServiceLabel, setControllerLabel } from './requestContext';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';
import { LoadOrderValidator } from './loadOrderValidator';
import colors from 'colors';
import config from '../../config';
import { sanitize, safeSerialize, truncate, exceedsSize } from './captureUtils';
import { shouldCapture } from './captureConfig';

// Validate: mongooseMetrics must be loaded first (only in non-test env)
if (!isTestEnv) {
  LoadOrderValidator.validate('AUTO_LABEL', ['MONGOOSE_METRICS'], 'autoLabelBootstrap.ts');
  // Register this module as loaded
  LoadOrderValidator.markLoaded('AUTO_LABEL', 'autoLabelBootstrap.ts');
}

const wrapService = (serviceName: string, obj: Record<string, any>) => {
  Object.keys(obj).forEach(key => {
    const original = obj[key];
    if (typeof original === 'function') {
      obj[key] = (...args: any[]) => {
        const label = `${serviceName}.${key}`;
        try { setServiceLabel(label); } catch {}
        const tracer = trace.getTracer('app');
        return tracer.startActiveSpan(`Service: ${label}`, async span => {
          const startTime = Date.now();

          try {
            // 🆕 NEW: Capture arguments
            if (config.tracing?.capture?.enabled && shouldCapture(label)) {
              try {
                const sanitized = sanitize(args, {
                  maskPII: config.tracing.capture.maskPII,
                });
                const truncated = truncate(sanitized, {
                  maxDepth: config.tracing.capture.maxDepth,
                  maxArrayItems: config.tracing.capture.maxArrayItems,
                  maxStringLength: config.tracing.capture.maxStringLength,
                });
                const serialized = safeSerialize(truncated);

                if (!exceedsSize(serialized, config.tracing.capture.maxSizeKB)) {
                  span.setAttribute('function.args', serialized);
                  span.setAttribute('function.args.count', args.length);
                }
              } catch {
                // Silent failure - doesn't affect existing functionality
              }
            }

            // Execute original function
            const out = original(...args);
            if (out && typeof (out as any).then === 'function') {
              const result = await out;

              // 🆕 NEW: Capture return value
              if (config.tracing?.capture?.enabled && shouldCapture(label, Date.now() - startTime)) {
                try {
                  const sanitized = sanitize(result, {
                    maskPII: config.tracing.capture.maskPII,
                  });
                  const truncated = truncate(sanitized, {
                    maxDepth: config.tracing.capture.maxDepth,
                    maxArrayItems: config.tracing.capture.maxArrayItems,
                    maxStringLength: config.tracing.capture.maxStringLength,
                  });
                  const serialized = safeSerialize(truncated);

                  if (!exceedsSize(serialized, config.tracing.capture.maxSizeKB)) {
                    span.setAttribute('function.result', serialized);
                    span.setAttribute('function.result.type', typeof result);
                    if (Array.isArray(result)) {
                      span.setAttribute('function.result.length', result.length);
                    }
                  }
                } catch {
                  // Silent failure
                }
              }

              return result;
            }
            return out;
          } catch (err) {
            span.recordException(err as any);
            span.setStatus({ code: SpanStatusCode.ERROR, message: (err as Error)?.message });
            throw err;
          } finally {
            span.end();
          }
        });
      };
    }
  });
};

const wrapController = (controllerName: string, obj: Record<string, any>) => {
  Object.keys(obj).forEach(key => {
    const original = obj[key];
    if (typeof original === 'function') {
      obj[key] = (...args: any[]) => {
        const label = `${controllerName}.${key}`;
        try { setControllerLabel(label); } catch {}
        const tracer = trace.getTracer('app');
        return tracer.startActiveSpan(`Controller: ${label}`, async span => {
          const startTime = Date.now();

          try {
            // 🆕 NEW: Capture arguments
            if (config.tracing?.capture?.enabled && shouldCapture(label)) {
              try {
                const sanitized = sanitize(args, {
                  maskPII: config.tracing.capture.maskPII,
                });
                const truncated = truncate(sanitized, {
                  maxDepth: config.tracing.capture.maxDepth,
                  maxArrayItems: config.tracing.capture.maxArrayItems,
                  maxStringLength: config.tracing.capture.maxStringLength,
                });
                const serialized = safeSerialize(truncated);

                if (!exceedsSize(serialized, config.tracing.capture.maxSizeKB)) {
                  span.setAttribute('function.args', serialized);
                  span.setAttribute('function.args.count', args.length);
                }
              } catch {
                // Silent failure
              }
            }

            // Execute original function
            const out = original(...args);
            if (out && typeof (out as any).then === 'function') {
              const result = await out;

              // 🆕 NEW: Capture return value
              if (config.tracing?.capture?.enabled && shouldCapture(label, Date.now() - startTime)) {
                try {
                  const sanitized = sanitize(result, {
                    maskPII: config.tracing.capture.maskPII,
                  });
                  const truncated = truncate(sanitized, {
                    maxDepth: config.tracing.capture.maxDepth,
                    maxArrayItems: config.tracing.capture.maxArrayItems,
                    maxStringLength: config.tracing.capture.maxStringLength,
                  });
                  const serialized = safeSerialize(truncated);

                  if (!exceedsSize(serialized, config.tracing.capture.maxSizeKB)) {
                    span.setAttribute('function.result', serialized);
                    span.setAttribute('function.result.type', typeof result);
                    if (Array.isArray(result)) {
                      span.setAttribute('function.result.length', result.length);
                    }
                  }
                } catch {
                  // Silent failure
                }
              }

              return result;
            }
            return out;
          } catch (err) {
            span.recordException(err as any);
            span.setStatus({ code: SpanStatusCode.ERROR, message: (err as Error)?.message });
            throw err;
          } finally {
            span.end();
          }
        });
      };
    }
  });
};

/**
 * Converts filename to PascalCase service/controller name
 * Examples:
 *   auth.service.ts → AuthService
 *   stripe-connect.service.js → StripeConnectService
 */
const fileNameToExportName = (fileName: string, suffix: 'Service' | 'Controller'): string => {
  // Handle both .ts and .js extensions
  const baseName = fileName
    .replace(`.${suffix.toLowerCase()}.ts`, '')
    .replace(`.${suffix.toLowerCase()}.js`, '');
    
  const pascalCase = baseName
    .split(/[-._]/) // Added . to handle dots in filenames if any
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  return pascalCase + suffix;
};

/**
 * Auto-discover and wrap all services and controllers
 * Scans app/modules/* for *.service.[ts|js] and *.controller.[ts|js] files
 */
const autoDiscoverAndWrap = (): void => {
  // Use a more robust path resolution that works for both src/ and dist/
  const modulesPath = join(__dirname, '../modules');

  let discoveredServices = 0;
  let discoveredControllers = 0;
  const failedFiles: string[] = [];

  try {
    // Check if modules path exists
    if (!existsSync(modulesPath)) {
      // In some production builds, the structure might be different
      // Let's not fail immediately, but log a warning if needed
      return;
    }

    // Get all module directories
    const moduleDirs = readdirSync(modulesPath).filter(item => {
      const itemPath = join(modulesPath, item);
      try {
        return statSync(itemPath).isDirectory();
      } catch {
        return false;
      }
    });

    // Process each module directory
    for (const moduleDir of moduleDirs) {
      const modulePath = join(modulesPath, moduleDir);

      let files: string[];
      try {
        files = readdirSync(modulePath);
      } catch (error) {
        continue; // Skip if can't read directory
      }

      // Auto-discover services (*.service.ts or *.service.js)
      const serviceFiles = files.filter(f => 
        (f.endsWith('.service.ts') || f.endsWith('.service.js')) && 
        !f.endsWith('.d.ts') // Skip declaration files
      );

      for (const serviceFile of serviceFiles) {
        const servicePath = join(modulePath, serviceFile);

        try {
          // Clear require cache for hot reload support
          try {
            const resolvedPath = require.resolve(servicePath);
            delete require.cache[resolvedPath];
          } catch {
            // Path not resolvable, skip cache clearing
          }

          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const serviceModule = require(servicePath);

          // Try to find the exported service object
          const expectedName = fileNameToExportName(serviceFile, 'Service');
          let serviceObj = serviceModule[expectedName] || serviceModule.default;

          // Fallback: try to find any export with 'Service' in the name
          if (!serviceObj) {
            const keys = Object.keys(serviceModule);
            const serviceKey = keys.find(k => k.includes('Service') && (typeof serviceModule[k] === 'object' || typeof serviceModule[k] === 'function'));
            serviceObj = serviceModule[serviceKey || ''];
          }

          // Wrap if valid object found
          if (serviceObj && typeof serviceObj === 'object') {
            wrapService(expectedName, serviceObj);
            discoveredServices++;
          }
        } catch (error) {
          // Graceful error handling
          if (!(error instanceof SyntaxError)) {
            failedFiles.push(`${serviceFile} (${(error as Error).message})`);
          }
        }
      }

      // Auto-discover controllers (*.controller.ts or *.controller.js)
      const controllerFiles = files.filter(f => 
        (f.endsWith('.controller.ts') || f.endsWith('.controller.js')) && 
        !f.endsWith('.d.ts')
      );

      for (const controllerFile of controllerFiles) {
        const controllerPath = join(modulePath, controllerFile);

        try {
          try {
            const resolvedPath = require.resolve(controllerPath);
            delete require.cache[resolvedPath];
          } catch {
            // Path not resolvable, skip cache clearing
          }

          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const controllerModule = require(controllerPath);

          // Try to find the exported controller object
          const expectedName = fileNameToExportName(controllerFile, 'Controller');
          let controllerObj = controllerModule[expectedName] || controllerModule.default;

          // Fallback: try to find any export with 'Controller' in the name
          if (!controllerObj) {
            const keys = Object.keys(controllerModule);
            const controllerKey = keys.find(k => k.includes('Controller') && (typeof controllerModule[k] === 'object' || typeof controllerModule[k] === 'function'));
            controllerObj = controllerModule[controllerKey || ''];
          }

          // Wrap if valid object found
          if (controllerObj && typeof controllerObj === 'object') {
            wrapController(expectedName, controllerObj);
            discoveredControllers++;
          }
        } catch (error) {
          if (!(error instanceof SyntaxError)) {
            failedFiles.push(`${controllerFile} (${(error as Error).message})`);
          }
        }
      }
    }

    // Log summary with beautiful box
    const totalModules = discoveredServices + discoveredControllers;
    if (totalModules > 0) {
      console.log('\n' + colors.cyan.bold('╔═══════════════════════════════════════════════════════════╗'));
      console.log(colors.cyan.bold('║') + colors.cyan.bold('              🎉 AUTO-LABELING COMPLETE                 ') + colors.cyan.bold('║'));
      console.log(colors.cyan.bold('╠═══════════════════════════════════════════════════════════╣'));
      console.log(colors.cyan.bold('║') + `  Services Wrapped       │ ${colors.green.bold(discoveredServices.toString()).padEnd(34)}` + colors.cyan.bold('║'));
      console.log(colors.cyan.bold('║') + `  Controllers Wrapped    │ ${colors.green.bold(discoveredControllers.toString()).padEnd(34)}` + colors.cyan.bold('║'));
      console.log(colors.cyan.bold('║') + `  Total Modules          │ ${colors.green.bold(totalModules.toString()).padEnd(34)}` + colors.cyan.bold('║'));
      console.log(colors.cyan.bold('╚═══════════════════════════════════════════════════════════╝\n'));
    }

    // Show warnings for failed files
    if (failedFiles.length > 0) {
      console.log(colors.yellow.bold('╔═══════════════════════════════════════════════════════════╗'));
      console.log(colors.yellow.bold('║') + colors.yellow.bold('              ⚠️  FAILED TO LOAD                         ') + colors.yellow.bold('║'));
      console.log(colors.yellow.bold('╠═══════════════════════════════════════════════════════════╣'));
      failedFiles.forEach(file => {
        const truncated = file.length > 57 ? file.substring(0, 54) + '...' : file;
        console.log(colors.yellow.bold('║') + colors.gray(`  • ${truncated.padEnd(57)}`) + colors.yellow.bold('║'));
      });
      console.log(colors.yellow.bold('╚═══════════════════════════════════════════════════════════╝\n'));
    }

    // Validation: Fail startup if no modules discovered (skip in test environment)
    if (discoveredServices === 0 && discoveredControllers === 0) {
      console.error('\n❌ Auto-discovery failed: No services or controllers found!');
      console.error('   Checked path: ' + modulesPath);
      console.error('   Expected structure: app/modules/*/{{moduleName}}.service.[ts|js]');
      
      // Don't exit in test environment
      if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
        // In production, we might want to be more lenient if it's just a labeling feature
        // but since it's a "bootstrap" failure, we'll keep the exit for now to ensure visibility
        process.exit(1);
      }
    }

  } catch (error) {
    console.error('\n❌ Auto-discovery error:', error);
    // Don't exit in test environment
    if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
      process.exit(1);
    }
  }
};

// Execute auto-discovery immediately (skip in test environment)
if (!isTestEnv) {
  autoDiscoverAndWrap();
} else {
  console.log('⏭️  Skipping auto-labeling in test environment');
}
