"use strict";
/**
 * BaseFactory - Abstract base class for all test factories
 *
 * Provides chainable API for building test data with:
 * - Traits (reusable configurations)
 * - States (lifecycle states)
 * - Sequences (auto-incrementing values)
 * - Transient attributes (non-persisted data)
 * - Lifecycle hooks (beforeCreate, afterCreate)
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
exports.BaseFactory = void 0;
const faker_1 = require("@faker-js/faker");
// ════════════════════════════════════════════════════════════
// BASE FACTORY CLASS
// ════════════════════════════════════════════════════════════
class BaseFactory {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(model) {
        this.data = {};
        this.transientData = {};
        this.appliedTraits = [];
        this.appliedStates = [];
        this.beforeCreateHooks = [];
        this.afterCreateHooks = [];
        this.sequences = new Map();
        this.model = model;
        this.data = this.getDefaults();
    }
    set(field, value) {
        if (field.includes('.')) {
            // Handle nested path
            const parts = field.split('.');
            let current = this.data;
            for (let i = 0; i < parts.length - 1; i++) {
                if (!(parts[i] in current)) {
                    current[parts[i]] = {};
                }
                current = current[parts[i]];
            }
            current[parts[parts.length - 1]] = value;
        }
        else {
            this.data[field] = value;
        }
        return this;
    }
    /**
     * Merge multiple fields at once
     *
     * @example
     * factory.with({ name: 'John', email: 'john@test.com' })
     */
    with(data) {
        this.data = Object.assign(Object.assign({}, this.data), data);
        return this;
    }
    /**
     * Apply a registered trait
     *
     * @example
     * factory.useTrait('verified')
     * factory.useTrait('premiumSeller')
     */
    useTrait(traitName) {
        const TraitClass = this.constructor;
        const trait = TraitClass.traits.get(traitName);
        if (!trait) {
            throw new Error(`Trait "${traitName}" not found for ${this.constructor.name}`);
        }
        this.data = trait.apply(this.data);
        this.appliedTraits.push(traitName);
        return this;
    }
    /**
     * Apply a registered state
     *
     * @example
     * factory.inState('blocked')
     * factory.inState('pending')
     */
    inState(stateName) {
        const StateClass = this.constructor;
        const state = StateClass.states.get(stateName);
        if (!state) {
            throw new Error(`State "${stateName}" not found for ${this.constructor.name}`);
        }
        this.data = state.apply(this.data);
        this.appliedStates.push(stateName);
        return this;
    }
    /**
     * Set a sequence for auto-incrementing values
     *
     * @example
     * factory.sequence('email', (n) => `user${n}@test.com`)
     */
    sequence(field, generator) {
        this.sequences.set(field, generator);
        return this;
    }
    /**
     * Store transient data (not persisted to DB)
     * Useful for storing raw passwords, etc.
     *
     * @example
     * factory.withTransient('rawPassword', 'Test@123')
     */
    withTransient(key, value) {
        this.transientData[key] = value;
        return this;
    }
    /**
     * Get transient data
     */
    getTransient(key) {
        return this.transientData[key];
    }
    /**
     * Add a beforeCreate hook
     *
     * @example
     * factory.beforeCreate(async (data) => {
     *   data.password = await bcrypt.hash(data.password, 10);
     *   return data;
     * })
     */
    beforeCreate(hook) {
        this.beforeCreateHooks.push(hook);
        return this;
    }
    /**
     * Add an afterCreate hook
     *
     * @example
     * factory.afterCreate((doc) => {
     *   console.log('Created:', doc._id);
     *   return doc;
     * })
     */
    afterCreate(hook) {
        this.afterCreateHooks.push(hook);
        return this;
    }
    /**
     * Conditional configuration
     *
     * @example
     * factory.when(needsStripe, (f) => f.withStripeConnect())
     */
    when(condition, fn) {
        if (condition) {
            return fn(this);
        }
        return this;
    }
    /**
     * Override with raw data (bypasses all processing)
     */
    raw(data) {
        this.data = data;
        return this;
    }
    // ════════════════════════════════════════════════════════════
    // BUILD & CREATE METHODS
    // ════════════════════════════════════════════════════════════
    /**
     * Build object without saving to database
     * Useful for testing validation or getting plain objects
     */
    build() {
        return __awaiter(this, void 0, void 0, function* () {
            let finalData = Object.assign({}, this.data);
            // Apply sequences
            for (const [field, generator] of this.sequences) {
                const counterKey = `${this.constructor.name}:${field}`;
                const counter = BaseFactory.sequenceCounters.get(counterKey) || 0;
                BaseFactory.sequenceCounters.set(counterKey, counter + 1);
                finalData[field] = generator(counter + 1);
            }
            // Run beforeCreate hooks
            for (const hook of this.beforeCreateHooks) {
                finalData = yield hook(finalData);
            }
            return finalData;
        });
    }
    /**
     * Create and save to database
     */
    create() {
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield this.build();
            let doc = yield this.model.create(data);
            // Run afterCreate hooks
            for (const hook of this.afterCreateHooks) {
                doc = (yield hook(doc));
            }
            return doc;
        });
    }
    /**
     * Create multiple documents
     *
     * @example
     * const users = await factory.createMany(5);
     */
    createMany(count) {
        return __awaiter(this, void 0, void 0, function* () {
            const results = [];
            for (let i = 0; i < count; i++) {
                // Create a fresh instance for each
                const factory = this.clone();
                results.push(yield factory.create());
            }
            return results;
        });
    }
    /**
     * Clone the factory with current state
     */
    clone() {
        const CloneClass = this.constructor;
        const clone = new CloneClass(this.model);
        clone.data = Object.assign({}, this.data);
        clone.transientData = Object.assign({}, this.transientData);
        clone.appliedTraits = [...this.appliedTraits];
        clone.appliedStates = [...this.appliedStates];
        clone.beforeCreateHooks = [...this.beforeCreateHooks];
        clone.afterCreateHooks = [...this.afterCreateHooks];
        clone.sequences = new Map(this.sequences);
        return clone;
    }
    // ════════════════════════════════════════════════════════════
    // STATIC HELPERS
    // ════════════════════════════════════════════════════════════
    /**
     * Register a trait for this factory
     */
    static defineTrait(name, apply) {
        this.traits.set(name, { name, apply });
    }
    /**
     * Register a state for this factory
     */
    static defineState(name, apply) {
        this.states.set(name, { name, apply });
    }
    /**
     * Reset all sequence counters
     * Call this in beforeEach to ensure consistent tests
     */
    static resetSequences() {
        BaseFactory.sequenceCounters.clear();
    }
    /**
     * Get faker instance for use in factories
     */
    get faker() {
        return faker_1.faker;
    }
}
exports.BaseFactory = BaseFactory;
// Static counters for sequences
BaseFactory.sequenceCounters = new Map();
// Trait and state registries (to be overridden by subclasses)
BaseFactory.traits = new Map();
BaseFactory.states = new Map();
