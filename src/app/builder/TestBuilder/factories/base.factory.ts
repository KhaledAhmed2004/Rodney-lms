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

import { faker } from '@faker-js/faker';
import { Model, Document, HydratedDocument } from 'mongoose';

// ════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ════════════════════════════════════════════════════════════

export interface FactoryOptions {
  /**
   * Whether to persist to database (default: true)
   * Set false to get plain object without saving
   */
  persist?: boolean;
}

export interface TraitDefinition<T> {
  name: string;
  apply: (data: Partial<T>) => Partial<T>;
}

export interface StateDefinition<T> {
  name: string;
  apply: (data: Partial<T>) => Partial<T>;
}

export type SequenceGenerator<T> = (n: number) => T;

export type LifecycleHook<TDoc> = (data: TDoc) => TDoc | Promise<TDoc>;

// ════════════════════════════════════════════════════════════
// BASE FACTORY CLASS
// ════════════════════════════════════════════════════════════

export abstract class BaseFactory<
  TDocument extends Document,
  TInput extends Record<string, any>
> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected model: Model<any>;
  protected data: Partial<TInput> = {};
  protected transientData: Record<string, any> = {};
  protected appliedTraits: string[] = [];
  protected appliedStates: string[] = [];
  protected beforeCreateHooks: LifecycleHook<Partial<TInput>>[] = [];
  protected afterCreateHooks: LifecycleHook<TDocument>[] = [];
  protected sequences: Map<string, SequenceGenerator<any>> = new Map();

  // Static counters for sequences
  protected static sequenceCounters: Map<string, number> = new Map();

  // Trait and state registries (to be overridden by subclasses)
  protected static traits: Map<string, TraitDefinition<any>> = new Map();
  protected static states: Map<string, StateDefinition<any>> = new Map();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(model: Model<any>) {
    this.model = model;
    this.data = this.getDefaults();
  }

  // ════════════════════════════════════════════════════════════
  // ABSTRACT METHODS (Must be implemented by subclasses)
  // ════════════════════════════════════════════════════════════

  /**
   * Returns default values for the model
   * Uses faker for realistic random data
   */
  protected abstract getDefaults(): Partial<TInput>;

  // ════════════════════════════════════════════════════════════
  // CHAINABLE METHODS
  // ════════════════════════════════════════════════════════════

  /**
   * Set a single field value
   * Supports nested paths like 'authentication.oneTimeCode'
   *
   * @example
   * factory.set('name', 'John Doe')
   * factory.set('authentication.isResetPassword', true)
   */
  set<K extends keyof TInput>(field: K, value: TInput[K]): this;
  set(field: string, value: any): this;
  set(field: string, value: any): this {
    if (field.includes('.')) {
      // Handle nested path
      const parts = field.split('.');
      let current: any = this.data;

      for (let i = 0; i < parts.length - 1; i++) {
        if (!(parts[i] in current)) {
          current[parts[i]] = {};
        }
        current = current[parts[i]];
      }

      current[parts[parts.length - 1]] = value;
    } else {
      (this.data as any)[field] = value;
    }

    return this;
  }

  /**
   * Merge multiple fields at once
   *
   * @example
   * factory.with({ name: 'John', email: 'john@test.com' })
   */
  with(data: Partial<TInput>): this {
    this.data = { ...this.data, ...data };
    return this;
  }

  /**
   * Apply a registered trait
   *
   * @example
   * factory.useTrait('verified')
   * factory.useTrait('premiumSeller')
   */
  useTrait(traitName: string): this {
    const TraitClass = (this.constructor as typeof BaseFactory);
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
  inState(stateName: string): this {
    const StateClass = (this.constructor as typeof BaseFactory);
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
  sequence<T>(field: string, generator: SequenceGenerator<T>): this {
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
  withTransient(key: string, value: any): this {
    this.transientData[key] = value;
    return this;
  }

  /**
   * Get transient data
   */
  getTransient<T = any>(key: string): T | undefined {
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
  beforeCreate(hook: LifecycleHook<Partial<TInput>>): this {
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
  afterCreate(hook: LifecycleHook<TDocument>): this {
    this.afterCreateHooks.push(hook);
    return this;
  }

  /**
   * Conditional configuration
   *
   * @example
   * factory.when(needsStripe, (f) => f.withStripeConnect())
   */
  when(condition: boolean, fn: (factory: this) => this): this {
    if (condition) {
      return fn(this);
    }
    return this;
  }

  /**
   * Override with raw data (bypasses all processing)
   */
  raw(data: Partial<TInput>): this {
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
  async build(): Promise<Partial<TInput>> {
    let finalData = { ...this.data };

    // Apply sequences
    for (const [field, generator] of this.sequences) {
      const counterKey = `${this.constructor.name}:${field}`;
      const counter = BaseFactory.sequenceCounters.get(counterKey) || 0;
      BaseFactory.sequenceCounters.set(counterKey, counter + 1);

      (finalData as any)[field] = generator(counter + 1);
    }

    // Run beforeCreate hooks
    for (const hook of this.beforeCreateHooks) {
      finalData = await hook(finalData);
    }

    return finalData;
  }

  /**
   * Create and save to database
   */
  async create(): Promise<TDocument> {
    const data = await this.build();
    let doc = await this.model.create(data as any) as TDocument;

    // Run afterCreate hooks
    for (const hook of this.afterCreateHooks) {
      doc = await hook(doc) as TDocument;
    }

    return doc;
  }

  /**
   * Create multiple documents
   *
   * @example
   * const users = await factory.createMany(5);
   */
  async createMany(count: number): Promise<TDocument[]> {
    const results: TDocument[] = [];

    for (let i = 0; i < count; i++) {
      // Create a fresh instance for each
      const factory = this.clone();
      results.push(await factory.create());
    }

    return results;
  }

  /**
   * Clone the factory with current state
   */
  protected clone(): this {
    const CloneClass = this.constructor as new (model: Model<TDocument>) => this;
    const clone = new CloneClass(this.model);

    clone.data = { ...this.data };
    clone.transientData = { ...this.transientData };
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
  static defineTrait<T>(name: string, apply: (data: Partial<T>) => Partial<T>): void {
    this.traits.set(name, { name, apply });
  }

  /**
   * Register a state for this factory
   */
  static defineState<T>(name: string, apply: (data: Partial<T>) => Partial<T>): void {
    this.states.set(name, { name, apply });
  }

  /**
   * Reset all sequence counters
   * Call this in beforeEach to ensure consistent tests
   */
  static resetSequences(): void {
    BaseFactory.sequenceCounters.clear();
  }

  /**
   * Get faker instance for use in factories
   */
  protected get faker() {
    return faker;
  }
}
