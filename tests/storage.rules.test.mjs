import fs from 'node:fs';
import test, { after, before } from 'node:test';

import {
  assertFails,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';

import {
  getBytes,
  ref,
  uploadBytes,
} from 'firebase/storage';

const PROJECT_ID = 'phcl-super-f0d21';

let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    storage: {
      rules: fs.readFileSync('storage.rules', 'utf8'),
      host: '127.0.0.1',
      port: 9199,
    },
  });
});

after(async () => {
  if (testEnv) {
    await testEnv.clearStorage();
    await testEnv.cleanup();
  }
});

test(
  'authenticated client cannot directly upload to media ingest',
  async () => {
    const uid = 'storage-rules-test-user';
    const mediaId = 'server-issued-media-id';
    const fileName = 'test-video.mp4';

    const storage =
      testEnv
        .authenticatedContext(uid)
        .storage();

    const objectRef = ref(
      storage,
      `media/ingest/${uid}/${mediaId}/${fileName}`,
    );

    const videoBytes =
      new Uint8Array([0, 1, 2, 3]);

    await assertFails(
      uploadBytes(
        objectRef,
        videoBytes,
        {
          contentType: 'video/mp4',
        },
      ),
    );
  },
);

test(
  'unauthenticated client cannot directly upload to media ingest',
  async () => {
    const uid = 'storage-rules-test-user';
    const mediaId = 'server-issued-media-id';
    const fileName = 'unauthenticated-video.mp4';

    const storage =
      testEnv
        .unauthenticatedContext()
        .storage();

    const objectRef = ref(
      storage,
      `media/ingest/${uid}/${mediaId}/${fileName}`,
    );

    const videoBytes =
      new Uint8Array([0, 1, 2, 3]);

    await assertFails(
      uploadBytes(
        objectRef,
        videoBytes,
        {
          contentType: 'video/mp4',
        },
      ),
    );
  },
);

test(
  'authenticated client cannot upload to another user ingest namespace',
  async () => {
    const authenticatedUid = 'storage-rules-user-a';
    const targetUid = 'storage-rules-user-b';
    const mediaId = 'server-issued-media-id';
    const fileName = 'cross-user-video.mp4';

    const storage =
      testEnv
        .authenticatedContext(authenticatedUid)
        .storage();

    const objectRef = ref(
      storage,
      `media/ingest/${targetUid}/${mediaId}/${fileName}`,
    );

    const videoBytes =
      new Uint8Array([0, 1, 2, 3]);

    await assertFails(
      uploadBytes(
        objectRef,
        videoBytes,
        {
          contentType: 'video/mp4',
        },
      ),
    );
  },
);

test(
  'authenticated client cannot directly read media ingest',
  async () => {
    const uid = 'storage-rules-read-test-user';
    const mediaId = 'server-issued-read-media-id';
    const fileName = 'private-source.mp4';
    const objectPath =
      `media/ingest/${uid}/${mediaId}/${fileName}`;

    await testEnv.withSecurityRulesDisabled(
      async (context) => {
        const storage =
          context.storage();

        await uploadBytes(
          ref(storage, objectPath),
          new Uint8Array([0, 1, 2, 3]),
          {
            contentType: 'video/mp4',
          },
        );
      },
    );

    const storage =
      testEnv
        .authenticatedContext(uid)
        .storage();

    await assertFails(
      getBytes(
        ref(storage, objectPath),
      ),
    );
  },
);

test(
  'authenticated client cannot write processed media',
  async () => {
    const uid = 'storage-rules-processed-test-user';

    const storage =
      testEnv
        .authenticatedContext(uid)
        .storage();

    const objectRef = ref(
      storage,
      'media/processed/test-media-id/720p/video.mp4',
    );

    await assertFails(
      uploadBytes(
        objectRef,
        new Uint8Array([0, 1, 2, 3]),
        {
          contentType: 'video/mp4',
        },
      ),
    );
  },
);

test(
  'authenticated client cannot write media thumbnails',
  async () => {
    const uid = 'storage-rules-thumbnail-test-user';

    const storage =
      testEnv
        .authenticatedContext(uid)
        .storage();

    const objectRef = ref(
      storage,
      'media/thumbnails/test-media-id/poster.jpg',
    );

    await assertFails(
      uploadBytes(
        objectRef,
        new Uint8Array([0, 1, 2, 3]),
        {
          contentType: 'image/jpeg',
        },
      ),
    );
  },
);

test(
  'authenticated client cannot write quarantined media',
  async () => {
    const uid = 'storage-rules-quarantine-test-user';

    const storage =
      testEnv
        .authenticatedContext(uid)
        .storage();

    const objectRef = ref(
      storage,
      'media/quarantine/test-media-id/rejected-source.mp4',
    );

    await assertFails(
      uploadBytes(
        objectRef,
        new Uint8Array([0, 1, 2, 3]),
        {
          contentType: 'video/mp4',
        },
      ),
    );
  },
);

test(
  'authenticated client cannot write arbitrary storage paths',
  async () => {
    const uid = 'storage-rules-default-deny-test-user';

    const storage =
      testEnv
        .authenticatedContext(uid)
        .storage();

    const objectRef = ref(
      storage,
      'unexpected/client-controlled/object.bin',
    );

    await assertFails(
      uploadBytes(
        objectRef,
        new Uint8Array([0, 1, 2, 3]),
        {
          contentType: 'application/octet-stream',
        },
      ),
    );
  },
);
