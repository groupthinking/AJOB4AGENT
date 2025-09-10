import { EmailService } from './services/email.service';
import dotenv from 'dotenv';

dotenv.config();

async function testEmailService() {
  console.log('🧪 Testing Email Service Configuration...');
  
  const emailService = new EmailService();
  
  try {
    // Test SMTP connection
    console.log('📧 Testing SMTP connection...');
    const isConnected = await emailService.verifyConnection();
    
    if (isConnected) {
      console.log('✅ SMTP connection successful!');
      
      // Test sending email if SMTP_TO is configured
      const testRecipient = process.env.SMTP_TO;
      if (testRecipient) {
        console.log(`📤 Sending test email to ${testRecipient}...`);
        
        await emailService.sendEmail({
          to: testRecipient,
          subject: '✅ AJOB4AGENT Email Test - Configuration Successful',
          html: `
            <h2>🎉 Email Configuration Test Successful!</h2>
            <p>Your AJOB4AGENT email service is properly configured and working.</p>
            <p><strong>Test Date:</strong> ${new Date().toISOString()}</p>
            <p>You should now receive daily job application reports automatically.</p>
            <hr>
            <small>This is a test message from AJOB4AGENT email service.</small>
          `
        });
        
        console.log('✅ Test email sent successfully!');
        console.log('🎯 Email service is fully functional!');
      } else {
        console.log('⚠️  SMTP_TO not configured - skipping test email');
        console.log('✅ SMTP connection verified, email service ready!');
      }
    } else {
      console.log('❌ SMTP connection failed');
      console.log('🔧 Please check your SMTP configuration in .env file');
    }
  } catch (error) {
    console.error('❌ Email service test failed:', error);
    console.log('\n🛠️  Troubleshooting tips:');
    console.log('1. Verify SMTP credentials in .env file');
    console.log('2. Check if your email provider requires app passwords');
    console.log('3. Ensure SMTP_HOST and SMTP_PORT are correct');
  }
}

// Run the test
testEmailService();