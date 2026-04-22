"use strict";
/**
 * System Alert Notification Template
 *
 * For system-wide announcements and alerts.
 *
 * @variables
 * - title: Alert title
 * - message: Alert message
 * - severity: 'info' | 'warning' | 'error' | 'success'
 * - actionUrl: URL for more info (optional)
 * - actionText: Action button text (optional)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.systemAlert = void 0;
const path_1 = __importDefault(require("path"));
const config_1 = __importDefault(require("../../../../config"));
exports.systemAlert = {
    name: 'systemAlert',
    push: {
        title: '{{title}}',
        body: '{{message}}',
        icon: path_1.default.join(process.cwd(), config_1.default.app.logo),
        data: {
            type: 'SYSTEM_ALERT',
            severity: '{{severity}}',
            action: 'VIEW_ALERT',
        },
    },
    socket: {
        event: 'SYSTEM_ALERT',
        data: {
            type: 'SYSTEM_ALERT',
            title: '{{title}}',
            message: '{{message}}',
            severity: '{{severity}}',
            actionUrl: '{{actionUrl}}',
        },
    },
    // No email for general system alerts
    email: undefined,
    database: {
        type: 'SYSTEM',
        title: '{{title}}',
        text: '{{message}}',
    },
};
exports.default = exports.systemAlert;
