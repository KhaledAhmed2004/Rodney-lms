/**
 * UserFactory - Factory for creating test users
 *
 * @example
 * const user = await TestBuilder.user().create();
 * const admin = await TestBuilder.user().asAdmin().create();
 * const { user, token } = await TestBuilder.user().createWithToken();
 */

import { faker } from '@faker-js/faker';
import { User } from '../../../modules/user/user.model';
import { IUser, USER_ROLES, USER_STATUS } from '../../../modules/user/user.interface';
import { BaseFactory } from './base.factory';
import { AuthHelper } from '../helpers/authHelper';
import type { Document } from 'mongoose';

// ════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ════════════════════════════════════════════════════════════

export type UserDocument = Document & IUser;

export interface UserWithToken {
  user: UserDocument;
  token: string;
  refreshToken: string;
  rawPassword: string;
}

// ════════════════════════════════════════════════════════════
// USER FACTORY CLASS
// ════════════════════════════════════════════════════════════

export class UserFactory extends BaseFactory<UserDocument, IUser> {
  // Static trait registry
  protected static traits = new Map();
  protected static states = new Map();

  // Default password (stored in transient for login tests)
  // Must be static or initialized before super() call
  private rawPassword: string;

  constructor() {
    // Initialize rawPassword BEFORE super() since getDefaults() uses it
    super(User);
    this.rawPassword = 'Test@123';
    // Re-set password in data since getDefaults() was called before rawPassword was set
    this.data.password = this.rawPassword;
    // Store raw password in transient for login tests
    this.withTransient('rawPassword', this.rawPassword);
  }

  // ════════════════════════════════════════════════════════════
  // DEFAULT VALUES
  // ════════════════════════════════════════════════════════════

  protected getDefaults(): Partial<IUser> {
    return {
      name: faker.person.fullName(),
      email: faker.internet.email().toLowerCase(),
      password: this.rawPassword || 'Test@123', // Will be hashed in beforeCreate
      role: USER_ROLES.STUDENT,
      status: USER_STATUS.ACTIVE,
      verified: true,
      location: faker.location.city(),
      gender: faker.helpers.arrayElement(['male', 'female']) as 'male' | 'female',
      dateOfBirth: faker.date.birthdate({ min: 18, max: 60, mode: 'age' }).toISOString(),
      phone: faker.phone.number(),
      profilePicture: faker.image.avatar(),
      about: faker.lorem.paragraph(),
      deviceTokens: [],
    };
  }

  // ════════════════════════════════════════════════════════════
  // ROLE METHODS
  // ════════════════════════════════════════════════════════════

  /**
   * Set user as SUPER_ADMIN
   */
  asAdmin(): this {
    return this.set('role', USER_ROLES.SUPER_ADMIN).set('verified', true);
  }

  /**
   * Set user as STUDENT
   */
  asStudent(): this {
    return this.set('role', USER_ROLES.STUDENT);
  }

  // ════════════════════════════════════════════════════════════
  // STATUS METHODS
  // ════════════════════════════════════════════════════════════

  /**
   * Set user as verified (email confirmed)
   */
  verified(): this {
    return this.set('verified', true);
  }

  /**
   * Set user as unverified
   */
  unverified(): this {
    return this.set('verified', false);
  }

  /**
   * Set user status to blocked/restricted
   */
  blocked(): this {
    return this.set('status', USER_STATUS.RESTRICTED);
  }

  /**
   * Set user status to inactive
   */
  inactive(): this {
    return this.set('status', USER_STATUS.INACTIVE);
  }

  /**
   * Set user status to deleted
   */
  deleted(): this {
    return this.set('status', USER_STATUS.DELETE);
  }

  /**
   * Set user status to active
   */
  active(): this {
    return this.set('status', USER_STATUS.ACTIVE);
  }

  // ════════════════════════════════════════════════════════════
  // FIELD SETTERS
  // ════════════════════════════════════════════════════════════

  /**
   * Set user name
   */
  withName(name: string): this {
    return this.set('name', name);
  }

  /**
   * Set user email
   */
  withEmail(email: string): this {
    return this.set('email', email.toLowerCase());
  }

  /**
   * Set user password (raw - will be hashed)
   */
  withPassword(password: string): this {
    this.rawPassword = password;
    this.withTransient('rawPassword', password);
    return this.set('password', password);
  }

  /**
   * Set user phone
   */
  withPhone(phone?: string): this {
    return this.set('phone', phone || faker.phone.number());
  }

  /**
   * Set user location
   */
  withLocation(location: string): this {
    return this.set('location', location);
  }

  /**
   * Set profile picture
   */
  withProfilePicture(url?: string): this {
    return this.set('profilePicture', url || faker.image.avatar());
  }

  /**
   * Set user about/bio
   */
  withAbout(about: string): this {
    return this.set('about', about);
  }

  /**
   * Add device token for push notifications
   */
  withDeviceToken(token?: string): this {
    const deviceToken = token || faker.string.alphanumeric(64);
    const current = (this.data.deviceTokens || []) as string[];
    return this.set('deviceTokens', [...current, deviceToken] as any);
  }

  /**
   * Set authentication data (for password reset testing)
   */
  withAuthenticationData(data?: {
    isResetPassword?: boolean;
    oneTimeCode?: number;
    expireAt?: Date;
  }): this {
    return this.set('authentication', {
      isResetPassword: data?.isResetPassword ?? true,
      oneTimeCode: data?.oneTimeCode ?? faker.number.int({ min: 100000, max: 999999 }),
      expireAt: data?.expireAt ?? new Date(Date.now() + 3600000), // 1 hour
    } as any);
  }

  /**
   * Set achievements
   */
  withAchievements(achievements: IUser['achievements']): this {
    return this.set('achievements', achievements as any);
  }

  // ════════════════════════════════════════════════════════════
  // COMPOSITE METHODS (Common Scenarios)
  // ════════════════════════════════════════════════════════════

  /**
   * Premium seller with high rating and all features
   */
  /**
   * New student - just registered
   */
  newStudent(): this {
    return this.asStudent()
      .verified();
  }

  /**
   * User awaiting email verification
   */
  pendingVerification(): this {
    return this.unverified()
      .withAuthenticationData({
        isResetPassword: false,
        oneTimeCode: faker.number.int({ min: 100000, max: 999999 }),
        expireAt: new Date(Date.now() + 3600000),
      });
  }

  /**
   * User in password reset flow
   */
  inPasswordReset(): this {
    return this.verified()
      .withAuthenticationData({
        isResetPassword: true,
        oneTimeCode: faker.number.int({ min: 100000, max: 999999 }),
        expireAt: new Date(Date.now() + 3600000),
      });
  }

  // ════════════════════════════════════════════════════════════
  // CREATE METHODS
  // ════════════════════════════════════════════════════════════

  /**
   * Build user data without saving
   * Note: Password is NOT hashed here - Mongoose pre-save hook handles hashing
   */
  async build(): Promise<Partial<IUser>> {
    const data = await super.build();
    // Password will be hashed by Mongoose pre-save hook
    // DO NOT hash here to avoid double-hashing
    return data;
  }

  /**
   * Create user with auto-generated JWT token
   * Useful for authenticated route testing
   *
   * @example
   * const { user, token } = await TestBuilder.user().createWithToken();
   * await request(app).get('/api/v1/profile').set('Authorization', `Bearer ${token}`);
   */
  async createWithToken(): Promise<UserWithToken> {
    const rawPassword = this.getTransient<string>('rawPassword') || 'Test@123';
    const user = await this.create();

    // Create TokenUser from document - cast to any to handle Mongoose types
    const tokenUser = {
      _id: String(user._id),
      email: user.email as string,
      role: user.role as string,
    };

    const token = AuthHelper.generateToken(tokenUser);
    const refreshToken = AuthHelper.generateRefreshToken(tokenUser);

    return { user, token, refreshToken, rawPassword };
  }

  /**
   * Create user and return with raw password
   * Useful for login tests
   */
  async createWithRawPassword(): Promise<{ user: UserDocument; rawPassword: string }> {
    const rawPassword = this.getTransient<string>('rawPassword') || 'Test@123';
    const user = await this.create();
    return { user, rawPassword };
  }
}

// ════════════════════════════════════════════════════════════
// REGISTER DEFAULT TRAITS
// ════════════════════════════════════════════════════════════

UserFactory.defineTrait<IUser>('verified', (data) => ({
  ...data,
  verified: true,
  status: USER_STATUS.ACTIVE,
}));

UserFactory.defineTrait<IUser>('unverified', (data) => ({
  ...data,
  verified: false,
}));

UserFactory.defineTrait<IUser>('blocked', (data) => ({
  ...data,
  status: USER_STATUS.RESTRICTED,
}));

UserFactory.defineTrait<IUser>('admin', (data) => ({
  ...data,
  role: USER_ROLES.SUPER_ADMIN,
  verified: true,
}));

UserFactory.defineTrait<IUser>('student', (data) => ({
  ...data,
  role: USER_ROLES.STUDENT,
}));

// ════════════════════════════════════════════════════════════
// REGISTER DEFAULT STATES
// ════════════════════════════════════════════════════════════

UserFactory.defineState<IUser>('active', (data) => ({
  ...data,
  status: USER_STATUS.ACTIVE,
}));

UserFactory.defineState<IUser>('inactive', (data) => ({
  ...data,
  status: USER_STATUS.INACTIVE,
}));

UserFactory.defineState<IUser>('restricted', (data) => ({
  ...data,
  status: USER_STATUS.RESTRICTED,
}));

UserFactory.defineState<IUser>('deleted', (data) => ({
  ...data,
  status: USER_STATUS.DELETE,
}));
