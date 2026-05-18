import { emailHelper } from '../helpers/emailHelper';
import { emailTemplate } from '../shared/emailTemplate';
import generateOTP from '../util/generateOTP';
import dotenv from 'dotenv';
import path from 'path';

// Load env variables
dotenv.config({ path: path.join(process.cwd(), '.env') });

const sendTestEmail = async () => {
  const targetEmail = 'test-1qqi67j36@srv1.mail-tester.com';
  const otp = generateOTP();
  
  console.log(`Sending test OTP email to: ${targetEmail}`);
  console.log(`Generated OTP: ${otp}`);

  const emailData = emailTemplate.createAccount({
    name: 'Mail Tester User',
    email: targetEmail,
    otp,
  });

  console.log('--- Plain Text Version ---');
  console.log(emailData.text);
  console.log('--------------------------');

  try {
    await emailHelper.sendEmail(emailData);
    console.log('Test email sent successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Failed to send test email:', error);
    process.exit(1);
  }
};

sendTestEmail();
