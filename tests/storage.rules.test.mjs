import fs from 'node:fs';
import test, { after, before } from 'node:test';

import {
  assertFails,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';

import {
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