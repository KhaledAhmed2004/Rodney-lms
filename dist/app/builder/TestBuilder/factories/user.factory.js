"use strict";
/**
 * UserFactory - Factory for creating test users
 *
 * @example
 * const user = await TestBuilder.user().create();
 * const admin = await TestBuilder.user().asAdmin().create();
 * const { user, token } = await TestBuilder.user().createWithToken();
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserFactory = void 0;
const faker_1 = require("@faker-js/faker");
const user_model_1 = require("../../../modules/user/user.model");
const user_interface_1 = require("../../../modules/user/user.interface");
const base_factory_1 = require("./base.factory");
const authHelper_1 = require("../helpers/authHelper");
// ════════════════════════════════════════════════════════════
// USER FACTORY CLASS
// ════════════════════════════════════════════════════════════
class UserFactory extends base_factory_1.BaseFactory {
    constructor() {
        // Initialize rawPassword BEFORE super() since getDefaults() uses it
        super(user_model_1.User);
        this.rawPassword = 'Test@123';
        // Re-set password in data since getDefaults() was called before rawPassword was set
        this.data.password = this.rawPassword;
        // Store raw password in transient for login tests
        this.withTransient('rawPassword', this.rawPassword);
    }
    // ════════════════════════════════════════════════════════════
    // DEFAULT VALUES
    // ════════════════════════════════════════════════════════════
    getDefaults() {
        return {
            name: faker_1.faker.person.fullName(),
            email: faker_1.faker.internet.email().toLowerCase(),
            password: this.rawPassword || 'Test@123', // Will be hashed in beforeCreate
            role: user_interface_1.USER_ROLES.STUDENT,
            status: user_interface_1.USER_STATUS.ACTIVE,
            verified: true,
            location: faker_1.faker.location.city(),
            gender: faker_1.faker.helpers.arrayElement(['male', 'female']),
            dateOfBirth: faker_1.faker.date.birthdate({ min: 18, max: 60, mode: 'age' }).toISOString(),
            phone: faker_1.faker.phone.number(),
            profilePicture: faker_1.faker.image.avatar(),
            averageRating: 0,
            ratingsCount: 0,
            about: faker_1.faker.lorem.paragraph(),
            deviceTokens: [],
        };
    }
    // ════════════════════════════════════════════════════════════
    // ROLE METHODS
    // ════════════════════════════════════════════════════════════
    /**
     * Set user as SUPER_ADMIN
     */
    asAdmin() {
        return this.set('role', user_interface_1.USER_ROLES.SUPER_ADMIN).set('verified', true);
    }
    /**
     * Set user as STUDENT
     */
    asStudent() {
        return this.set('role', user_interface_1.USER_ROLES.STUDENT);
    }
    // ════════════════════════════════════════════════════════════
    // STATUS METHODS
    // ════════════════════════════════════════════════════════════
    /**
     * Set user as verified (email confirmed)
     */
    verified() {
        return this.set('verified', true);
    }
    /**
     * Set user as unverified
     */
    unverified() {
        return this.set('verified', false);
    }
    /**
     * Set user status to blocked/restricted
     */
    blocked() {
        return this.set('status', user_interface_1.USER_STATUS.RESTRICTED);
    }
    /**
     * Set user status to inactive
     */
    inactive() {
        return this.set('status', user_interface_1.USER_STATUS.INACTIVE);
    }
    /**
     * Set user status to deleted
     */
    deleted() {
        return this.set('status', user_interface_1.USER_STATUS.DELETE);
    }
    /**
     * Set user status to active
     */
    active() {
        return this.set('status', user_interface_1.USER_STATUS.ACTIVE);
    }
    // ════════════════════════════════════════════════════════════
    // FIELD SETTERS
    // ════════════════════════════════════════════════════════════
    /**
     * Set user name
     */
    withName(name) {
        return this.set('name', name);
    }
    /**
     * Set user email
     */
    withEmail(email) {
        return this.set('email', email.toLowerCase());
    }
    /**
     * Set user password (raw - will be hashed)
     */
    withPassword(password) {
        this.rawPassword = password;
        this.withTransient('rawPassword', password);
        return this.set('password', password);
    }
    /**
     * Set user phone
     */
    withPhone(phone) {
        return this.set('phone', phone || faker_1.faker.phone.number());
    }
    /**
     * Set user location
     */
    withLocation(location) {
        return this.set('location', location);
    }
    /**
     * Set profile picture
     */
    withProfilePicture(url) {
        return this.set('profilePicture', url || faker_1.faker.image.avatar());
    }
    /**
     * Set user about/bio
     */
    withAbout(about) {
        return this.set('about', about);
    }
    /**
     * Set user rating
     */
    withRating(rating, count = 10) {
        return this.set('averageRating', rating).set('ratingsCount', count);
    }
    /**
     * Add device token for push notifications
     */
    withDeviceToken(token) {
        const deviceToken = token || faker_1.faker.string.alphanumeric(64);
        const current = (this.data.deviceTokens || []);
        return this.set('deviceTokens', [...current, deviceToken]);
    }
    /**
     * Set authentication data (for password reset testing)
     */
    withAuthenticationData(data) {
        var _a, _b, _c;
        return this.set('authentication', {
            isResetPassword: (_a = data === null || data === void 0 ? void 0 : data.isResetPassword) !== null && _a !== void 0 ? _a : true,
            oneTimeCode: (_b = data === null || data === void 0 ? void 0 : data.oneTimeCode) !== null && _b !== void 0 ? _b : faker_1.faker.number.int({ min: 100000, max: 999999 }),
            expireAt: (_c = data === null || data === void 0 ? void 0 : data.expireAt) !== null && _c !== void 0 ? _c : new Date(Date.now() + 3600000), // 1 hour
        });
    }
    /**
     * Set achievements
     */
    withAchievements(achievements) {
        return this.set('achievements', achievements);
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
    newStudent() {
        return this.asStudent()
            .verified()
            .withRating(0, 0);
    }
    /**
     * User awaiting email verification
     */
    pendingVerification() {
        return this.unverified()
            .withAuthenticationData({
            isResetPassword: false,
            oneTimeCode: faker_1.faker.number.int({ min: 100000, max: 999999 }),
            expireAt: new Date(Date.now() + 3600000),
        });
    }
    /**
     * User in password reset flow
     */
    inPasswordReset() {
        return this.verified()
            .withAuthenticationData({
            isResetPassword: true,
            oneTimeCode: faker_1.faker.number.int({ min: 100000, max: 999999 }),
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
    build() {
        const _super = Object.create(null, {
            build: { get: () => super.build }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield _super.build.call(this);
            // Password will be hashed by Mongoose pre-save hook
            // DO NOT hash here to avoid double-hashing
            return data;
        });
    }
    /**
     * Create user with auto-generated JWT token
     * Useful for authenticated route testing
     *
     * @example
     * const { user, token } = await TestBuilder.user().createWithToken();
     * await request(app).get('/api/v1/profile').set('Authorization', `Bearer ${token}`);
     */
    createWithToken() {
        return __awaiter(this, void 0, void 0, function* () {
            const rawPassword = this.getTransient('rawPassword') || 'Test@123';
            const user = yield this.create();
            // Create TokenUser from document - cast to any to handle Mongoose types
            const tokenUser = {
                _id: String(user._id),
                email: user.email,
                role: user.role,
            };
            const token = authHelper_1.AuthHelper.generateToken(tokenUser);
            const refreshToken = authHelper_1.AuthHelper.generateRefreshToken(tokenUser);
            return { user, token, refreshToken, rawPassword };
        });
    }
    /**
     * Create user and return with raw password
     * Useful for login tests
     */
    createWithRawPassword() {
        return __awaiter(this, void 0, void 0, function* () {
            const rawPassword = this.getTransient('rawPassword') || 'Test@123';
            const user = yield this.create();
            return { user, rawPassword };
        });
    }
}
exports.UserFactory = UserFactory;
// Static trait registry
UserFactory.traits = new Map();
UserFactory.states = new Map();
// ════════════════════════════════════════════════════════════
// REGISTER DEFAULT TRAITS
// ════════════════════════════════════════════════════════════
UserFactory.defineTrait('verified', (data) => (Object.assign(Object.assign({}, data), { verified: true, status: user_interface_1.USER_STATUS.ACTIVE })));
UserFactory.defineTrait('unverified', (data) => (Object.assign(Object.assign({}, data), { verified: false })));
UserFactory.defineTrait('blocked', (data) => (Object.assign(Object.assign({}, data), { status: user_interface_1.USER_STATUS.RESTRICTED })));
UserFactory.defineTrait('admin', (data) => (Object.assign(Object.assign({}, data), { role: user_interface_1.USER_ROLES.SUPER_ADMIN, verified: true })));
UserFactory.defineTrait('student', (data) => (Object.assign(Object.assign({}, data), { role: user_interface_1.USER_ROLES.STUDENT })));
// ════════════════════════════════════════════════════════════
// REGISTER DEFAULT STATES
// ════════════════════════════════════════════════════════════
UserFactory.defineState('active', (data) => (Object.assign(Object.assign({}, data), { status: user_interface_1.USER_STATUS.ACTIVE })));
UserFactory.defineState('inactive', (data) => (Object.assign(Object.assign({}, data), { status: user_interface_1.USER_STATUS.INACTIVE })));
UserFactory.defineState('restricted', (data) => (Object.assign(Object.assign({}, data), { status: user_interface_1.USER_STATUS.RESTRICTED })));
UserFactory.defineState('deleted', (data) => (Object.assign(Object.assign({}, data), { status: user_interface_1.USER_STATUS.DELETE })));
