"use strict";
/**
 * PaymentFactory - Factory for creating test payment records
 *
 * @example
 * const payment = await TestBuilder.payment()
 *   .fromUser(buyer)
 *   .toUser(seller)
 *   .withAmount(5000)
 *   .pending()
 *   .create();
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentFactory = void 0;
const faker_1 = require("@faker-js/faker");
const mongoose_1 = require("mongoose");
const payment_model_1 = require("../../../modules/payment/payment.model");
const payment_interface_1 = require("../../../modules/payment/payment.interface");
const base_factory_1 = require("./base.factory");
// Platform fee percentage (default 20%)
const PLATFORM_FEE_PERCENTAGE = 20;
// ════════════════════════════════════════════════════════════
// PAYMENT FACTORY CLASS
// ════════════════════════════════════════════════════════════
class PaymentFactory extends base_factory_1.BaseFactory {
    constructor() {
        super(payment_model_1.Payment);
    }
    // ════════════════════════════════════════════════════════════
    // DEFAULT VALUES
    // ════════════════════════════════════════════════════════════
    getDefaults() {
        const amount = faker_1.faker.number.int({ min: 1000, max: 100000 });
        const platformFee = Math.floor(amount * (PLATFORM_FEE_PERCENTAGE / 100));
        return {
            amount,
            platformFee,
            freelancerAmount: amount - platformFee,
            status: payment_interface_1.PAYMENT_STATUS.PENDING,
            currency: payment_interface_1.CURRENCY.USD,
            stripePaymentIntentId: `pi_${faker_1.faker.string.alphanumeric(24)}`,
            metadata: {},
        };
    }
    // ════════════════════════════════════════════════════════════
    // REQUIRED RELATIONS
    // ════════════════════════════════════════════════════════════
    /**
     * Set the task this payment is for (REQUIRED)
     */
    forTask(task) {
        return this.set('taskId', this.toObjectId(task));
    }
    /**
     * Set the poster/buyer who is paying (REQUIRED)
     */
    fromUser(user) {
        return this.set('posterId', this.toObjectId(user));
    }
    /**
     * Alias for fromUser
     */
    fromPoster(user) {
        return this.fromUser(user);
    }
    /**
     * Set the freelancer/seller who receives payment (REQUIRED)
     */
    toUser(user) {
        return this.set('freelancerId', this.toObjectId(user));
    }
    /**
     * Alias for toUser
     */
    toFreelancer(user) {
        return this.toUser(user);
    }
    /**
     * Set the bid this payment is for (optional)
     */
    forBid(bid) {
        return this.set('bidId', this.toObjectId(bid));
    }
    // ════════════════════════════════════════════════════════════
    // AMOUNT METHODS
    // ════════════════════════════════════════════════════════════
    /**
     * Set payment amount (auto-calculates fees)
     *
     * @param amount - Total amount in cents/smallest currency unit
     * @param feePercentage - Platform fee percentage (default: 20)
     */
    withAmount(amount, feePercentage = PLATFORM_FEE_PERCENTAGE) {
        const platformFee = Math.floor(amount * (feePercentage / 100));
        const freelancerAmount = amount - platformFee;
        return this.set('amount', amount)
            .set('platformFee', platformFee)
            .set('freelancerAmount', freelancerAmount);
    }
    /**
     * Set explicit fee breakdown (override auto-calculation)
     */
    withFees(platformFee, freelancerAmount) {
        return this.set('platformFee', platformFee)
            .set('freelancerAmount', freelancerAmount)
            .set('amount', platformFee + freelancerAmount);
    }
    /**
     * Set currency
     */
    withCurrency(currency) {
        return this.set('currency', currency);
    }
    // ════════════════════════════════════════════════════════════
    // STRIPE METHODS
    // ════════════════════════════════════════════════════════════
    /**
     * Set Stripe payment intent ID
     */
    withStripePaymentIntent(intentId) {
        return this.set('stripePaymentIntentId', intentId || `pi_${faker_1.faker.string.alphanumeric(24)}`);
    }
    /**
     * Set Stripe transfer ID (for released payments)
     */
    withStripeTransfer(transferId) {
        return this.set('stripeTransferId', transferId || `tr_${faker_1.faker.string.alphanumeric(24)}`);
    }
    // ════════════════════════════════════════════════════════════
    // STATUS METHODS
    // ════════════════════════════════════════════════════════════
    /**
     * Set status to pending
     */
    pending() {
        return this.set('status', payment_interface_1.PAYMENT_STATUS.PENDING);
    }
    /**
     * Set status to held (escrow)
     */
    held() {
        return this.set('status', payment_interface_1.PAYMENT_STATUS.HELD);
    }
    /**
     * Alias for held
     */
    inEscrow() {
        return this.held();
    }
    /**
     * Set status to released (completed)
     */
    released() {
        return this.set('status', payment_interface_1.PAYMENT_STATUS.RELEASED)
            .withStripeTransfer();
    }
    /**
     * Alias for released
     */
    completed() {
        return this.released();
    }
    /**
     * Set status to refunded
     */
    refunded(reason) {
        return this.set('status', payment_interface_1.PAYMENT_STATUS.REFUNDED)
            .set('refundReason', reason || 'Requested by user');
    }
    /**
     * Set status to failed
     */
    failed() {
        return this.set('status', payment_interface_1.PAYMENT_STATUS.FAILED);
    }
    /**
     * Set status to cancelled
     */
    cancelled() {
        return this.set('status', payment_interface_1.PAYMENT_STATUS.CANCELLED);
    }
    // ════════════════════════════════════════════════════════════
    // METADATA METHODS
    // ════════════════════════════════════════════════════════════
    /**
     * Set payment metadata
     */
    withMetadata(metadata) {
        return this.set('metadata', metadata);
    }
    /**
     * Add to existing metadata
     */
    addMetadata(key, value) {
        const current = (this.data.metadata || {});
        return this.set('metadata', Object.assign(Object.assign({}, current), { [key]: value }));
    }
    /**
     * Set refund reason
     */
    withRefundReason(reason) {
        return this.set('refundReason', reason);
    }
    // ════════════════════════════════════════════════════════════
    // COMPOSITE METHODS (Common Scenarios)
    // ════════════════════════════════════════════════════════════
    /**
     * Create a successful completed payment
     */
    successfulPayment(amount = 5000) {
        return this.withAmount(amount)
            .released()
            .withStripePaymentIntent()
            .withStripeTransfer();
    }
    /**
     * Create a pending escrow payment
     */
    escrowPayment(amount = 5000) {
        return this.withAmount(amount)
            .held()
            .withStripePaymentIntent();
    }
    /**
     * Create a refunded payment
     */
    refundedPayment(amount = 5000, reason) {
        return this.withAmount(amount)
            .refunded(reason || 'Customer request')
            .withStripePaymentIntent();
    }
    // ════════════════════════════════════════════════════════════
    // HELPER METHODS
    // ════════════════════════════════════════════════════════════
    /**
     * Convert to ObjectId
     */
    toObjectId(obj) {
        if (obj instanceof mongoose_1.Types.ObjectId) {
            return obj;
        }
        if (typeof obj === 'string') {
            return new mongoose_1.Types.ObjectId(obj);
        }
        if (typeof obj._id === 'string') {
            return new mongoose_1.Types.ObjectId(obj._id);
        }
        return obj._id;
    }
}
exports.PaymentFactory = PaymentFactory;
PaymentFactory.traits = new Map();
PaymentFactory.states = new Map();
// ════════════════════════════════════════════════════════════
// REGISTER DEFAULT TRAITS
// ════════════════════════════════════════════════════════════
PaymentFactory.defineTrait('small', (data) => (Object.assign(Object.assign({}, data), { amount: 1000, platformFee: 200, freelancerAmount: 800 })));
PaymentFactory.defineTrait('medium', (data) => (Object.assign(Object.assign({}, data), { amount: 10000, platformFee: 2000, freelancerAmount: 8000 })));
PaymentFactory.defineTrait('large', (data) => (Object.assign(Object.assign({}, data), { amount: 100000, platformFee: 20000, freelancerAmount: 80000 })));
// ════════════════════════════════════════════════════════════
// REGISTER DEFAULT STATES
// ════════════════════════════════════════════════════════════
PaymentFactory.defineState('pending', (data) => (Object.assign(Object.assign({}, data), { status: payment_interface_1.PAYMENT_STATUS.PENDING })));
PaymentFactory.defineState('held', (data) => (Object.assign(Object.assign({}, data), { status: payment_interface_1.PAYMENT_STATUS.HELD })));
PaymentFactory.defineState('released', (data) => (Object.assign(Object.assign({}, data), { status: payment_interface_1.PAYMENT_STATUS.RELEASED, stripeTransferId: `tr_${faker_1.faker.string.alphanumeric(24)}` })));
PaymentFactory.defineState('refunded', (data) => (Object.assign(Object.assign({}, data), { status: payment_interface_1.PAYMENT_STATUS.REFUNDED, refundReason: 'Refund requested' })));
PaymentFactory.defineState('failed', (data) => (Object.assign(Object.assign({}, data), { status: payment_interface_1.PAYMENT_STATUS.FAILED })));
PaymentFactory.defineState('cancelled', (data) => (Object.assign(Object.assign({}, data), { status: payment_interface_1.PAYMENT_STATUS.CANCELLED })));
