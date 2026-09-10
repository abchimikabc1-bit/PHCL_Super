import {
  generateKeyPairSync,
} from 'node:crypto';

/**
 * Public certificate used only by PHCL automated tests.
 *
 * This certificate does not belong to a real Visa merchant
 * and must never be used outside automated testing.
 */
export const VISA_TEST_CERTIFICATE = `
-----BEGIN CERTIFICATE-----
MIIDIzCCAgugAwIBAgIUEJA6dvGd0XDrSVJQeFbevybih34wDQYJKoZIhvcNAQEL
BQAwITEfMB0GA1UEAwwWUEhDTCBWaXNhIEFkYXB0ZXIgVGVzdDAeFw0yNjA5MTAw
ODQ2NDVaFw0zNjA5MDcwODQ2NDVaMCExHzAdBgNVBAMMFlBIQ0wgVmlzYSBBZGFw
dGVyIFRlc3QwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDLk+F5be6Z
PVwgKgMSN9Qhj/V6HGeNuXiekJa70rZcuvxQRRzBpfhPx42zZr9vcZM+My7+4oAR
RP59l7Uc5hO3Kih1iao/S7+uu9cb3jeU02ltaKpBQC/nk2J3g/wTSqR+5q0m4BUU
TErYbGl3zM/neHIKpUnUqd98ORLgadCxIS9eUzN+1LM64bQoy85vL+Nk/bxD/Adg
pvOaGPZfx97t4Bc295K5p9MEnHTELY5qZYpnCJhQmvYGqQX7LALT6wKhOXW5iVjo
9r6RU8/5RA5sdXKiRJj55R7XHtr6zOdFZIxkq14VqFUDgy5N9XKosjYUUD1bImH0
L8oeW132VEgLAgMBAAGjUzBRMB0GA1UdDgQWBBTXB0I2WypLI8ZbEqMvLszP7mIx
ZjAfBgNVHSMEGDAWgBTXB0I2WypLI8ZbEqMvLszP7mIxZjAPBgNVHRMBAf8EBTAD
AQH/MA0GCSqGSIb3DQEBCwUAA4IBAQCfVzPtVRnLRVIP3/xZnkyHATeyztD/AhIa
SC+s7Z5igtLOZpOzxFuKYpIgivXXPYZwF61PYLwqu7iEKjWj2NwjMpFp8ZmhrX0b
RCKajaDE/s1Y5ZvCSuuYyXrQyML4wte1SUJ78aTuABBvO5OXPK6KyBGDfwUzRkm1
2OgZk8vIkyWemdqaMnD0VXCVgqU+ITrxpPMF+D9PVitFFYSVzqQ9JY++PVCCEuNR
zdbQr0SFKLqVvo/Cy+RuUoYPtFQZuCaHpGdLsLpTLnjz/S5xm0dyRoRzl95xS13M
yc7bJYg+aqtHNtBcQUZmSNbQw7+q83cE4Mvn5uGyKuPXyBM/+JIh
-----END CERTIFICATE-----
`.trim();

export const VISA_TEST_MERCHANT_ID =
  'phcl_test_merchant';

export const VISA_TEST_WEBHOOK_KEY_ID =
  'phcl_visa_test_webhook_key';

export const VISA_TEST_WEBHOOK_SECRET =
  Buffer
    .from(
      'phcl-visa-webhook-test-secret-value-2026',
      'utf8',
    )
    .toString(
      'base64',
    );

/**
 * Generates a temporary private key in memory.
 *
 * No private key is committed to Git, written to disk,
 * logged or reused outside the current test process.
 */
export function createVisaTestPrivateKey():
  string {
  const {
    privateKey,
  } =
    generateKeyPairSync(
      'rsa',
      {
        modulusLength:
          2_048,

        publicExponent:
          0x10001,

        privateKeyEncoding: {
          type:
            'pkcs8',

          format:
            'pem',
        },

        publicKeyEncoding: {
          type:
            'spki',

          format:
            'pem',
        },
      },
    );

  return privateKey;
}

export function createVisaTestPaymentToken(
  options?: {
    issuedAt?:
      number;

    expiresAt?:
      number;

    tokenId?:
      string;
  },
): string {
  const nowSeconds =
    Math.floor(
      Date.now() /
        1_000,
    );

  const header =
    Buffer
      .from(
        JSON.stringify({
          alg:
            'RS256',

          typ:
            'JWT',
        }),
        'utf8',
      )
      .toString(
        'base64url',
      );

  const payload =
    Buffer
      .from(
        JSON.stringify({
          iss:
            'Flex/Test',

          iat:
            options?.issuedAt ??
            nowSeconds,

          exp:
            options?.expiresAt ??
            nowSeconds + 600,

          jti:
            options?.tokenId ??
            'phcl_test_transient_token',
        }),
        'utf8',
      )
      .toString(
        'base64url',
      );

  return `${header}.${payload}.test_signature`;
}