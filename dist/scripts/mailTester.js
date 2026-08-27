"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const emailHelper_1 = require("../helpers/emailHelper");
const emailTemplate_1 = require("../shared/emailTemplate");
const generateOTP_1 = __importDefault(require("../util/generateOTP"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load env variables
dotenv_1.default.config({ path: path_1.default.join(process.cwd(), '.env') });
const sendTestEmail = () => __awaiter(void 0, void 0, void 0, function* () {
    const targetEmail = 'test-1qqi67j36@srv1.mail-tester.com';
    const otp = (0, generateOTP_1.default)();
    console.log(`Sending test OTP email to: ${targetEmail}`);
    console.log(`Generated OTP: ${otp}`);
    const emailData = emailTemplate_1.emailTemplate.createAccount({
        name: 'Mail Tester User',
        email: targetEmail,
        otp,
    });
    console.log('--- Plain Text Version ---');
    console.log(emailData.text);
    console.log('--------------------------');
    try {
        yield emailHelper_1.emailHelper.sendEmail(emailData);
        console.log('Test email sent successfully!');
        process.exit(0);
    }
    catch (error) {
        console.error('Failed to send test email:', error);
        process.exit(1);
    }
});
sendTestEmail();
