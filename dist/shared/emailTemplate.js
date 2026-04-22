"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailTemplate = void 0;
const EmailBuilder_1 = require("../app/builder/EmailBuilder/EmailBuilder");
const config_1 = __importDefault(require("../config"));
const createAccount = (values) => {
    const builder = new EmailBuilder_1.EmailBuilder();
    const title = 'Account Verification';
    builder
        .setSubject(`Verify Your ${config_1.default.app.name} Account`)
        .addComponent('header', {
        title: `Welcome, ${values.name}!`,
        subtitle: `We are excited to have you join ${config_1.default.app.name}.`
    })
        .addText(`To complete your account registration, please use the following one-time verification code:`)
        .addComponent('otp', { code: values.otp.toString() })
        .addText(`This code is valid for 3 minutes. For your security, please do not share this code with anyone.`)
        .addDivider()
        .addText(`If you did not create an account with us, you can safely ignore this email.`);
    const { html, subject, attachments } = builder.build();
    return {
        to: values.email,
        subject,
        html,
        attachments,
    };
};
const resetPassword = (values) => {
    const builder = new EmailBuilder_1.EmailBuilder();
    builder
        .setSubject(`Reset Your Password - ${config_1.default.app.name}`)
        .addComponent('header', {
        title: 'Password Reset Request',
        subtitle: 'You requested to reset your password.'
    })
        .addText(`Use the following code to proceed with resetting your password:`)
        .addComponent('otp', { code: values.otp.toString() })
        .addText(`This code will expire in 3 minutes.`)
        .addDivider()
        .addText(`If you didn't request a password reset, please ignore this email or contact support if you have concerns.`);
    const { html, subject, attachments } = builder.build();
    return {
        to: values.email,
        subject,
        html,
        attachments,
    };
};
exports.emailTemplate = {
    createAccount,
    resetPassword,
};
