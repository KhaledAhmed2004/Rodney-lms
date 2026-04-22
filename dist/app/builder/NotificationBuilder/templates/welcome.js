"use strict";
/**
 * Welcome Notification Template
 *
 * Sent when a new user registers.
 *
 * @variables
 * - name: User's name
 * - appName: Application name
 * - verificationUrl: Email verification URL (optional)
 * - otp: OTP code for verification (optional)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.welcome = void 0;
const path_1 = __importDefault(require("path"));
const config_1 = __importDefault(require("../../../../config"));
exports.welcome = {
    name: 'welcome',
    push: {
        title: '🎉 Welcome to {{appName}}!',
        body: 'Hi {{name}}, thanks for joining us!',
        icon: path_1.default.join(process.cwd(), config_1.default.app.logo),
        data: {
            type: 'WELCOME',
            action: 'COMPLETE_PROFILE',
        },
    },
    // No socket for welcome (user just registered)
    socket: undefined,
    email: {
        template: 'welcome',
        subject: '🎉 Welcome to {{appName}}, {{name}}!',
    },
    // No database entry for welcome (not persistent notification)
    database: undefined,
};
exports.default = exports.welcome;
