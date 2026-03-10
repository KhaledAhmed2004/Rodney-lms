/**
 * AuthHelper - JWT token generation utilities for testing
 *
 * @example
 * const token = AuthHelper.generateToken(user);
 * const expiredToken = AuthHelper.generateExpiredToken(user);
 */

import jwt, { SignOptions, Secret } from 'jsonwebtoken';
import { Types } from 'mongoose';

// ════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ════════════════════════════════════════════════════════════

export interface TokenUser {
  _id: Types.ObjectId | string;
  email: string;
  role: string;
}

export interface TokenPayload {
  id: string;
  email: string;
  role: string;
}

// ════════════════════════════════════════════════════════════
// AUTH HELPER CLASS
// ════════════════════════════════════════════════════════════

export class AuthHelper {
  // Default test secret (fallback if config not available)
  private static readonly DEFAULT_SECRET = 'test-jwt-secret-key-for-testing-only';
  private static readonly DEFAULT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-testing-only';
  private static readonly DEFAULT_EXPIRATION = '1d';
  private static readonly DEFAULT_REFRESH_EXPIRATION = '7d';

  /**
   * Get JWT secret (with fallback for test environment)
   * Uses process.env directly to match what config.ts uses
   */
  private static getSecret(): Secret {
    // Use process.env directly - same source as config.ts
    return process.env.JWT_SECRET || this.DEFAULT_SECRET;
  }

  /**
   * Get JWT refresh secret (with fallback for test environment)
   * Uses process.env directly to match what config.ts uses
   */
  private static getRefreshSecret(): Secret {
    // Use process.env directly - same source as config.ts
    return process.env.JWT_REFRESH_SECRET || this.DEFAULT_REFRESH_SECRET;
  }

  /**
   * Get JWT expiration (with fallback)
   */
  private static getExpiration(): string {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const config = require('../../../../config').default;
      return config?.jwt?.jwt_expire_in || this.DEFAULT_EXPIRATION;
    } catch {
      return this.DEFAULT_EXPIRATION;
    }
  }

  /**
   * Get JWT refresh expiration (with fallback)
   */
  private static getRefreshExpiration(): string {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const config = require('../../../../config').default;
      return config?.jwt?.jwt_refresh_expire_in || this.DEFAULT_REFRESH_EXPIRATION;
    } catch {
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
  static generateToken(user: TokenUser, expiresIn?: string | number): string {
    const payload: TokenPayload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const options: SignOptions = {
      expiresIn: (expiresIn || this.getExpiration()) as any,
    };

    return jwt.sign(payload, this.getSecret(), options);
  }

  /**
   * Generate a valid JWT refresh token for a user
   *
   * @param user - User document or object with _id, email, role
   * @param expiresIn - Token expiration (default: from config or '7d')
   */
  static generateRefreshToken(user: TokenUser, expiresIn?: string | number): string {
    const payload: TokenPayload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const options: SignOptions = {
      expiresIn: (expiresIn || this.getRefreshExpiration()) as any,
    };

    return jwt.sign(payload, this.getRefreshSecret(), options);
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
  static generateExpiredToken(user: TokenUser): string {
    const payload: TokenPayload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    // Create a token that's already expired by setting issued at to past
    // and using a very short expiration
    const now = Math.floor(Date.now() / 1000);
    const expiredPayload = {
      ...payload,
      iat: now - 3600, // Issued 1 hour ago
      exp: now - 1800, // Expired 30 minutes ago
    };

    // Sign without expiration option since we're setting exp manually
    return jwt.sign(expiredPayload, this.getSecret());
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
  static generateTamperedToken(user: TokenUser): string {
    const payload: TokenPayload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const options: SignOptions = {
      expiresIn: '1d',
    };

    // Sign with wrong secret
    return jwt.sign(payload, 'wrong-secret-key', options);
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
  static generateCustomToken(payload: Record<string, any>, expiresIn: string | number = '1d'): string {
    const options: SignOptions = {
      expiresIn: expiresIn as any,
    };

    return jwt.sign(payload, this.getSecret(), options);
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
  static generateTokenWithRole(user: TokenUser, role: string): string {
    const payload: TokenPayload = {
      id: user._id.toString(),
      email: user.email,
      role: role, // Override role
    };

    const options: SignOptions = {
      expiresIn: this.getExpiration() as any,
    };

    return jwt.sign(payload, this.getSecret(), options);
  }

  /**
   * Decode a token without verification
   * Useful for debugging tests
   *
   * @param token - JWT token string
   */
  static decodeToken(token: string): TokenPayload | null {
    try {
      return jwt.decode(token) as TokenPayload;
    } catch {
      return null;
    }
  }

  /**
   * Verify a token and return payload
   * Throws if invalid
   *
   * @param token - JWT token string
   */
  static verifyToken(token: string): TokenPayload {
    return jwt.verify(token, this.getSecret()) as TokenPayload;
  }

  /**
   * Check if a token is expired
   *
   * @param token - JWT token string
   */
  static isExpired(token: string): boolean {
    try {
      jwt.verify(token, this.getSecret());
      return false;
    } catch (error: any) {
      return error.name === 'TokenExpiredError';
    }
  }
}
