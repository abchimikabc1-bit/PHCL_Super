import OpenAI from 'openai';
import {
  NextRequest,
  NextResponse,
} from 'next/server';

export const runtime = 'nodejs';
export const dynamic =
  'force-dynamic';

type SupportedLanguage =
  | 'sw'
  | 'en'
  | 'fr'
  | 'zh';

type ClientRole =
  | 'user'
  | 'assistant';

type ClientMessage = {
  role?: ClientRole;
  content?: string;
};

type ChatRequestBody = {
  language?: SupportedLanguage;
  messages?: ClientMessage[];
};

const LANGUAGE_NAMES: Record<
  SupportedLanguage,
  string
> = {
  sw: 'Kiswahili cha Tanzania',
  en: 'English',
  fr: 'French',
  zh: 'Simplified Chinese',
};

const normalizeLanguage = (
  value: unknown,
): SupportedLanguage => {
  if (
    value === 'sw' ||
    value === 'en' ||
    value === 'fr' ||
    value === 'zh'
  ) {
    return value;
  }

  return 'sw';
};

const sanitizeMessages = (
  value: unknown,
) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(-20)

    .map((entry) => {
      if (
        !entry ||
        typeof entry !==
          'object'
      ) {
        return null;
      }

      const item =
        entry as ClientMessage;

      const role =
        item.role === 'user' ||
        item.role === 'assistant'
          ? item.role
          : null;

      const content =
        typeof item.content ===
        'string'
          ? item.content
              .trim()
              .slice(0, 4000)
          : '';

      if (
        !role ||
        !content
      ) {
        return null;
      }

      return {
        role,
        content,
      };
    })

    .filter(
      (
        item,
      ): item is {
        role: ClientRole;
        content: string;
      } => Boolean(item),
    );
};

export async function POST(
  request: NextRequest,
) {
  try {
    const apiKey =
      process.env
        .OPENAI_API_KEY
        ?.trim();

    if (!apiKey) {
      console.error(
        'OPENAI_API_KEY is not configured.',
      );

      return NextResponse.json(
        {
          ok: false,

          message:
            'PHCL AI service is not configured.',
        },

        {
          status: 500,
        },
      );
    }

    let body: ChatRequestBody;

    try {
      body =
        (await request.json()) as ChatRequestBody;
    } catch {
      return NextResponse.json(
        {
          ok: false,

          message:
            'Invalid request body.',
        },

        {
          status: 400,
        },
      );
    }

    const language =
      normalizeLanguage(
        body.language,
      );

    const messages =
      sanitizeMessages(
        body.messages,
      );

    if (
      messages.length === 0
    ) {
      return NextResponse.json(
        {
          ok: false,

          message:
            'A chat message is required.',
        },

        {
          status: 400,
        },
      );
    }

    const hasUserMessage =
      messages.some(
        (message) =>
          message.role ===
          'user',
      );

    if (!hasUserMessage) {
      return NextResponse.json(
        {
          ok: false,

          message:
            'A user message is required.',
        },

        {
          status: 400,
        },
      );
    }

    const client =
      new OpenAI({
        apiKey,
      });

    const response =
      await client.responses.create(
        {
          model:
            process.env
              .OPENAI_MODEL
              ?.trim() ||
            'gpt-5.6-terra',

          reasoning: {
            effort: 'low',
          },

          instructions: `
You are PHCL AI Assistant for PI-HUB COMPANY LIMITED and the PHCL Super platform.

Default response language:
${LANGUAGE_NAMES[language]}.

If the user clearly requests another language, follow that request.

Your responsibilities:

- Help users understand PHCL Super and its public features.
- Explain marketplace, wallet concepts, technology, Web2, Web3, blockchain, entrepreneurship and digital education.
- Give clear, practical and easy-to-understand guidance.
- Be respectful, professional and accurate.
- Never invent PHCL account balances, transactions, customer records, stock, prices, licences or regulatory approvals.
- Never claim PHCL is a bank or regulator.
- Never claim that a financial service is licensed unless trusted application data explicitly proves that status.
- Never request passwords, PINs, OTP codes, API keys, Secret Recovery Phrases or private keys.
- If a user shares sensitive authentication information, advise them to secure or rotate it.
- For financial, legal or regulatory questions, provide educational information and distinguish it from professional advice.
- If private PHCL data or a system action is needed but unavailable, clearly say that you do not have access instead of inventing information.
          `.trim(),

          input: messages.map(
            (message) => ({
              role:
                message.role,

              content:
                message.content,
            }),
          ),
        },
      );

    const reply =
      response.output_text?.trim();

    if (!reply) {
      return NextResponse.json(
        {
          ok: false,

          message:
            'PHCL AI returned an empty response.',
        },

        {
          status: 502,
        },
      );
    }

    return NextResponse.json({
      ok: true,
      reply,
    });
  } catch (error) {
    console.error(
      'PHCL AI API error:',
      error,
    );

    return NextResponse.json(
      {
        ok: false,

        message:
          'PHCL AI is temporarily unavailable.',
      },

      {
        status: 500,
      },
    );
  }
}