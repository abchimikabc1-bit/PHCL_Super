import { NextResponse } from 'next/server';
import { validateKycRegistration } from '@/lib/security/kyc-validation';

const MAX_BODY_BYTES = 10_000;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return NextResponse.json(
        {
          ok: false,
          code: 'UNSUPPORTED_MEDIA_TYPE',
          message: 'Content-Type must be application/json.',
        },
        { status: 415 }
      );
    }

    const rawBody = await request.text();

    if (rawBody.length > MAX_BODY_BYTES) {
      return NextResponse.json(
        {
          ok: false,
          code: 'PAYLOAD_TOO_LARGE',
          message: 'Request body is too large.',
        },
        { status: 413 }
      );
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        {
          ok: false,
          code: 'INVALID_JSON',
          message: 'Invalid JSON payload.',
        },
        { status: 400 }
      );
    }

    if (!isPlainObject(body)) {
      return NextResponse.json(
        {
          ok: false,
          code: 'INVALID_PAYLOAD',
          message: 'Request body must be a JSON object.',
        },
        { status: 400 }
      );
    }

    const result = validateKycRegistration(body);

    if (!result.valid) {
      return NextResponse.json(
        {
          ok: false,
          code: 'VALIDATION_ERROR',
          message: 'Validation failed.',
          errors: result.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        code: 'REGISTRATION_ACCEPTED',
        message: 'Registration input accepted.',
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        code: 'INTERNAL_ERROR',
        message: 'Registration could not be completed.',
      },
      { status: 500 }
    );
  }
}