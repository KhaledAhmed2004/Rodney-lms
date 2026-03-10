"use strict";
/**
 * AuthHelper - JWT token generation utilities for testing
 *
 * @example
 * const token = AuthHelper.generateToken(user);
 * const expiredToken = AuthHelper.generateExpiredToken(user);
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthHelper = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// ════════════════════════════════════════════════════════════
// AUTH HELPER CLASS
// ════════════════════════════════════════════════════════════
class AuthHelper {
    /**
     * Get JWT secret (with fallback for test environment)
     * Uses process.env directly to match what config.ts uses
     */
    static getSecret() {
        // Use process.env directly - same source as config.ts
        return process.env.JWT_SECRET || this.DEFAULT_SECRET;
    }
    /**
     * Get JWT refresh secret (with fallback for test environment)
     * Uses process.env directly to match what config.ts uses
     */
    static getRefreshSecret() {
        // Use process.env directly - same source as config.ts
        return process.env.JWT_REFRESH_SECRET || this.DEFAULT_REFRESH_SECRET;
    }
    /**
     * Get JWT expiration (with fallback)
     */
    static getExpiration() {
        var _a;
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const config = require('../../../../config').default;
            return ((_a = config === null || config === void 0 ? void 0 : config.jwt) === null || _a === void 0 ? void 0 : _a.jwt_expire_in) || this.DEFAULT_EXPIRATION;
        }
        catch (_b) {
            return this.DEFAULT_EXPIRATION;
        }
    }
    /**
     * Get JWT refresh expiration (with fallback)
     */
    static getRefreshExpiration() {
        var _a;
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const config = require('../../../../config').default;
            return ((_a = config === null || config === void 0 ? void 0 : config.jwt) === null || _a === void 0 ? void 0 : _a.jwt_refresh_expire_in) || this.DEFAULT_REFRESH_EXPIRATION;
        }
        catch (_b) {
            return this.DEFAULT_REFRESH_EXPIRATION;
        }
    }
    /**
     * Generate a valid JWT access token for a user
     *
     * @param user - User document or object with _id, email, role
     * @param expiresIn - Token expiration (default: from config or '1d')
     *
     * @example
     * const token = AuthHelper.generateToken(user);
     * // Use in request
     * request(app).get('/api/v1/profile').set('Authorization', `Bearer ${token}`);
     */
    static generateToken(user, expiresIn) {
        const payload = {
            id: user._id.toString(),
            email: user.email,
            role: user.role,
        };
        const options = {
            expiresIn: (expiresIn || this.getExpiration()),
        };
        return jsonwebtoken_1.default.sign(payload, this.getSecret(), options);
    }
    /**
     * Generate a valid JWT refresh token for a user
     *
     * @param user - User document or object with _id, email, role
     * @param expiresIn - Token expiration (default: from config or '7d')
     */
    static generateRefreshToken(user, expiresIn) {
        const payload = {
            id: user._id.toString(),
            email: user.email,
            role: user.role,
        };
        const options = {
            expiresIn: (expiresIn || this.getRefreshExpiration()),
        };
        return jsonwebtoken_1.default.sign(payload, this.getRefreshSecret(), options);
    }
    /**
     * Generate an EXPIRED JWT token for testing 401 responses
     *
     * @param user - User document or object with _id, email, role
     *
     * @example
     * const expiredToken = AuthHelper.generateExpiredToken(user);
     * const res = await request(app)
     *   .get('/api/v1/profile')
     *   .set('Authorization', `Bearer ${expiredToken}`);
     * expect(res.status).toBe(401);
     */
    static generateExpiredToken(user) {
        const payload = {
            id: user._id.toString(),
            email: user.email,
            role: user.role,
        };
        // Create a token that's already expired by setting issued at to past
        // and using a very short expiration
        const now = Math.floor(Date.now() / 1000);
        const expiredPayload = Object.assign(Object.assign({}, payload), { iat: now - 3600, exp: now - 1800 });
        // Sign without expiration option since we're setting exp manually
        return jsonwebtoken_1.default.sign(expiredPayload, this.getSecret());
    }
    /**
     * Generate a TAMPERED/INVALID JWT token for testing signature verification
     *
     * @param user - User document or object with _id, email, role
     *
     * @example
     * const tamperedToken = AuthHelper.generateTamperedToken(user);
     * const res = await request(app)
     *   .get('/api/v1/profile')
     *   .set('Authorization', `Bearer ${tamperedToken}`);
     * expect(res.status).toBe(401);
     */
    static generateTamperedToken(user) {
        const payload = {
            id: user._id.toString(),
            email: user.email,
            role: user.role,
        };
        const options = {
            expiresIn: '1d',
        };
        // Sign with wrong secret
        return jsonwebtoken_1.default.sign(payload, 'wrong-secret-key', options);
    }
    /**
     * Generate a token with custom payload
     * Useful for testing edge cases
     *
     * @param payload - Custom payload object
     * @param expiresIn - Token expiration
     *
     * @example
     * const customToken = AuthHelper.generateCustomToken({ userId: 'invalid' });
     */
    static generateCustomToken(payload, expiresIn = '1d') {
        const options = {
            expiresIn: expiresIn,
        };
        return jsonwebtoken_1.default.sign(payload, this.getSecret(), options);
    }
    /**
     * Generate a token for a different role (useful for RBAC testing)
     *
     * @param user - User document
     * @param role - Override role for testing
     *
     * @example
     * // Test admin-only route with user token that has admin role
     * const adminToken = AuthHelper.generateTokenWithRole(user, 'SUPER_ADMIN');
     */
    static generateTokenWithRole(user, role) {
        const payload = {
            id: user._id.toString(),
            email: user.email,
            role: role, // Override role
        };
        const options = {
            expiresIn: this.getExpiration(),
        };
        return jsonwebtoken_1.default.sign(payload, this.getSecret(), options);
    }
    /**
     * Decode a token without verification
     * Useful for debugging tests
     *
     * @param token - JWT token string
     */
    static decodeToken(token) {
        try {
            return jsonwebtoken_1.default.decode(token);
        }
        catch (_a) {
            return null;
        }
    }
    /**
     * Verify a token and return payload
     * Throws if invalid
     *
     * @param token - JWT token string
     */
    static verifyToken(token) {
        return jsonwebtoken_1.default.verify(token, this.getSecret());
    }
    /**
     * Check if a token is expired
     *
     * @param token - JWT token string
     */
    static isExpired(token) {
        try {
            jsonwebtoken_1.default.verify(token, this.getSecret());
            return false;
        }
        catch (error) {
            return error.name === 'TokenExpiredError';
        }
    }
}
exports.AuthHelper = AuthHelper;
// Default test secret (fallback if config not available)
AuthHelper.DEFAULT_SECRET = 'test-jwt-secret-key-for-testing-only';
AuthHelper.DEFAULT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-testing-only';
AuthHelper.DEFAULT_EXPIRATION = '1d';
AuthHelper.DEFAULT_REFRESH_EXPIRATION = '7d';
