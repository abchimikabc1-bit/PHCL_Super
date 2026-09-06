import {
  adminAuth,
} from '../lib/firebase-admin';

const MAX_USERS = 50;

function maskEmail(
  email: string | undefined,
): string {
  if (!email) {
    return '(no email)';
  }

  const atIndex =
    email.indexOf('@');

  if (atIndex <= 0) {
    return '(masked)';
  }

  const local =
    email.slice(
      0,
      atIndex,
    );

  const domain =
    email.slice(
      atIndex + 1,
    );

  const visible =
    local.slice(
      0,
      Math.min(
        2,
        local.length,
      ),
    );

  return `${visible}***@${domain}`;
}

async function main(): Promise<void> {
  console.log('');
  console.log(
    'PHCL SUPER — FIREBASE TEST USERS',
  );
  console.log(
    '--------------------------------',
  );

  const result =
    await adminAuth.listUsers(
      MAX_USERS,
    );

  if (
    result.users.length === 0
  ) {
    console.log(
      'No Firebase Auth users found.',
    );

    return;
  }

  for (
    const user of result.users
  ) {
    console.log('');
    console.log(
      `UID   : ${user.uid}`,
    );
    console.log(
      `Email : ${maskEmail(user.email)}`,
    );
    console.log(
      `Disabled: ${user.disabled}`,
    );
  }

  console.log('');
  console.log(
    `Users shown: ${result.users.length}`,
  );

  if (result.pageToken) {
    console.log(
      `More than ${MAX_USERS} users exist; only the first ${MAX_USERS} were shown.`,
    );
  }

  console.log('');
}

main().catch(
  (
    error: unknown,
  ) => {
    const message =
      error instanceof Error
        ? error.message
        : 'Unknown Firebase Auth error.';

    console.error('');
    console.error(
      `[PHCL Firebase Users] ${message}`,
    );
    console.error('');

    process.exitCode = 1;
  },
);