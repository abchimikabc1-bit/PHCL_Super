const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[1-9][0-9]{9,14}$/;

export interface NotificationDispatchResult {
  channel: 'email' | 'sms';
  delivered: boolean;
  provider: 'sendgrid' | 'twilio' | 'log';
  recipient: string;
  messageId?: string;
  error?: string;
}

export const normalizeEmailAddress = (value: string): string | null => {
  const normalized = value.trim().toLowerCase();
  return EMAIL_REGEX.test(normalized) ? normalized : null;
};

export const normalizePhoneNumber = (value: string): string | null => {
  const normalized = value.trim().replace(/[\s()-]/g, '');
  return PHONE_REGEX.test(normalized) ? normalized : null;
};

export async function sendEmailMessage(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<NotificationDispatchResult> {
  const recipient = normalizeEmailAddress(input.to);
  if (!recipient) {
    return {
      channel: 'email',
      delivered: false,
      provider: 'log',
      recipient: input.to,
      error: 'Invalid email address',
    };
  }

  const apiKey = process.env.SENDGRID_API_KEY?.trim();
  const fromEmail = normalizeEmailAddress(process.env.SENDGRID_FROM_EMAIL || '');

  if (!apiKey || !fromEmail) {
    console.log(`[EMAIL:FALLBACK] To: ${recipient}\nSubject: ${input.subject}\n${input.text}`);
    return {
      channel: 'email',
      delivered: false,
      provider: 'log',
      recipient,
      error: 'SendGrid is not configured',
    };
  }

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: recipient }] }],
      from: { email: fromEmail },
      subject: input.subject,
      content: [
        { type: 'text/plain', value: input.text },
        ...(input.html ? [{ type: 'text/html', value: input.html }] : []),
      ],
    }),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => `SendGrid returned ${response.status}`);
    return {
      channel: 'email',
      delivered: false,
      provider: 'sendgrid',
      recipient,
      error: message.slice(0, 500),
    };
  }

  return {
    channel: 'email',
    delivered: true,
    provider: 'sendgrid',
    recipient,
    messageId: response.headers.get('x-message-id') || undefined,
  };
}

export async function sendSmsMessage(input: {
  to: string;
  message: string;
}): Promise<NotificationDispatchResult> {
  const recipient = normalizePhoneNumber(input.to);
  if (!recipient) {
    return {
      channel: 'sms',
      delivered: false,
      provider: 'log',
      recipient: input.to,
      error: 'Invalid phone number',
    };
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const fromNumber = normalizePhoneNumber(process.env.TWILIO_FROM_NUMBER || '');

  if (!accountSid || !authToken || !fromNumber) {
    console.log(`[SMS:FALLBACK] To: ${recipient}\n${input.message}`);
    return {
      channel: 'sms',
      delivered: false,
      provider: 'log',
      recipient,
      error: 'Twilio is not configured',
    };
  }

  const body = new URLSearchParams({
    To: recipient,
    From: fromNumber,
    Body: input.message,
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    }
  );

  const payload = (await response.json().catch(() => null)) as { sid?: string; message?: string } | null;

  if (!response.ok) {
    return {
      channel: 'sms',
      delivered: false,
      provider: 'twilio',
      recipient,
      error: payload?.message || `Twilio returned ${response.status}`,
    };
  }

  return {
    channel: 'sms',
    delivered: true,
    provider: 'twilio',
    recipient,
    messageId: payload?.sid,
  };
}
