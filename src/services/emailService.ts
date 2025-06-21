
'use server';

import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587, // Use 587 for TLS
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.GOOGLE_SMTP_USER, 
    pass: process.env.GOOGLE_SMTP_PASSWORD,
  },
  tls: {
    // do not fail on invalid certs
    rejectUnauthorized: false
  }
});

export async function sendEmail({ to, subject, html }: EmailOptions): Promise<{success: boolean; error?: string; messageId?: string}> {
  if (!process.env.GOOGLE_SMTP_USER || !process.env.GOOGLE_SMTP_PASSWORD) {
    console.error('SMTP_USER or SMTP_PASSWORD environment variables are not set.');
    return { success: false, error: 'Email server not configured. Please set GOOGLE_SMTP_USER and GOOGLE_SMTP_PASSWORD in your .env file.' };
  }

  const mailOptions = {
    from: `"Weatherwise Alerts" <${process.env.GOOGLE_SMTP_USER}>`,
    to,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Message sent: %s', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error sending email.';
    return { success: false, error: `Failed to send email: ${errorMessage}` };
  }
}
