
'use server';

import nodemailer from 'nodemailer';

const emailConfig = {
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : undefined,
  // secure: true for 465, false for other ports
  secure: process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) === 465 : false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
};

const isEmailConfigured = emailConfig.host && emailConfig.port && emailConfig.auth.user && emailConfig.auth.pass;

if (!isEmailConfigured) {
  console.warn(
    'Email service is not fully configured. Please set EMAIL_HOST, EMAIL_PORT, EMAIL_USER, and EMAIL_PASSWORD in your .env file to enable email features.'
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
        errorMessage = 'Could not connect to the email server. Please check the host and port settings.';
    } else if (error.code === 'EAUTH') {
        errorMessage = 'Authentication failed. Please check the email user and password.';
    } else {
        errorMessage = `An unexpected error occurred: ${error.message}`;
    }
    return { success: false, error: errorMessage };
  }
}
