
'use server';

import nodemailer from 'nodemailer';

const emailConfig = {
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD, // This should be a 16-digit App Password
  },
};

const isEmailConfigured = emailConfig.auth.user && emailConfig.auth.pass;

if (!isEmailConfigured) {
  console.warn(
    'Email service is not fully configured. Please set EMAIL_USER and EMAIL_PASSWORD (for Gmail) in your .env file to enable email features.'
  );
}

const transporter = isEmailConfigured ? nodemailer.createTransport(emailConfig) : null;

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({
  to,
  subject,
  html,
}: EmailOptions): Promise<{ success: boolean; error?: string }> {
  if (!transporter) {
    const message = 'Email service is not configured on the server. Administrator must set environment variables.';
    console.error(message);
    return { success: false, error: message };
  }

  const from = process.env.EMAIL_FROM || emailConfig.auth.user;

  try {
    const info = await transporter.sendMail({
      from: `"Weatherwise" <${from}>`,
      to,
      subject,
      html,
    });
    console.log("Email sent successfully: %s", info.messageId);
    return { success: true };
  } catch (error: any) {
    console.error('Failed to send email via nodemailer:', error);
    // Provide a more specific error if possible
    let errorMessage = `Failed to send email.`;
    if (error.code === 'ECONNECTION') {
        errorMessage = 'Could not connect to the email server. Please check your network and firewall settings.';
    } else if (error.code === 'EAUTH' || (error.response && error.response.includes('Authentication failed'))) {
        errorMessage = 'Gmail authentication failed. Please ensure you are using a correct 16-digit App Password, not your regular password.';
    } else {
        errorMessage = `An unexpected error occurred: ${error.message}`;
    }
    return { success: false, error: errorMessage };
  }
}
