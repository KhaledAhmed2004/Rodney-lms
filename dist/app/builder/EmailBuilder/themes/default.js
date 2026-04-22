"use strict";
/**
 * Default Light Theme for EmailBuilder
 *
 * This is the primary theme used for most emails.
 * You can modify these values to match your brand.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultTheme = void 0;
const path_1 = __importDefault(require("path"));
const config_1 = __importDefault(require("../../../../config"));
exports.defaultTheme = {
    name: 'default',
    colors: {
        // Primary brand color - used for buttons, links, highlights
        primary: '#277E16',
        // Secondary color - used for secondary actions
        secondary: '#5A9E4B',
        // Background color - outer email background
        background: '#F5F5F5',
        // Surface color - main content area background
        surface: '#FFFFFF',
        // Text colors
        text: '#333333',
        textMuted: '#666666',
        // Border color
        border: '#E0E0E0',
        // Status colors
        success: '#28A745',
        warning: '#FFC107',
        error: '#DC3545',
    },
    fonts: {
        // Primary font for body text
        primary: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        // Heading font
        heading: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    },
    spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
    },
    borderRadius: '8px',
    // Logo configuration - update with your logo
    logo: {
        url: path_1.default.join(process.cwd(), config_1.default.app.logo),
        width: '150',
        height: 'auto',
        alt: config_1.default.app.name,
    },
    // Social media links - add your links
    social: {
        facebook: 'https://facebook.com/riseandimpact',
        twitter: 'https://twitter.com/riseandimpact',
        instagram: 'https://instagram.com/riseandimpact',
        linkedin: 'https://linkedin.com/company/riseandimpact',
        // youtube: 'https://youtube.com/yourcompany',
    },
    // Company information for footer
    company: {
        name: config_1.default.app.name,
        address: 'Your Address Here',
        phone: '+1 234 567 890',
        email: 'support@riseandimpact.com',
        website: 'https://riseandimpact.com',
    },
};
exports.default = exports.defaultTheme;
