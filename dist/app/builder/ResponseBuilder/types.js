"use strict";
/**
 * ResponseBuilder Types
 *
 * TypeScript interfaces for type-safe response transformation.
 *
 * @module ResponseBuilder/types
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_EXCLUDES = exports.MONGODB_FIELDS = exports.SENSITIVE_FIELDS = void 0;
// ==================== COMMON FIELD SETS ====================
/**
 * Common sensitive fields to exclude
 */
exports.SENSITIVE_FIELDS = [
    'password',
    'authentication',
    'resetPasswordToken',
    'resetPasswordExpires',
    'verificationToken',
    'verificationExpires',
    '__v',
];
/**
 * Common MongoDB fields to transform
 */
exports.MONGODB_FIELDS = {
    _id: 'id',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
};
/**
 * Default fields to always exclude
 */
exports.DEFAULT_EXCLUDES = ['__v'];
