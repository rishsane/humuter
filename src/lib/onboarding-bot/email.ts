export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendOtpEmail(email: string, otp: string): Promise<boolean> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    console.error('[onboarding] SENDGRID_API_KEY not set');
    return false;
  }

  try {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email }] }],
        from: { email: 'noreply@humuter.com', name: 'Humuter' },
        subject: 'Your Humuter verification code',
        content: [
          {
            type: 'text/plain',
            value: `Your verification code is: ${otp}\n\nThis code expires in 10 minutes. If you didn't request this, ignore this email.`,
          },
        ],
      }),
    });

    if (!res.ok) {
      console.error('[onboarding] SendGrid error:', res.status, await res.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error('[onboarding] Failed to send OTP email:', error);
    return false;
  }
}

export function verifyOtp(storedOtp: string | null, inputOtp: string): boolean {
  if (!storedOtp) return false;
  return storedOtp === inputOtp.trim();
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}
