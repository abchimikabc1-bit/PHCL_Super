import assert from 'node:assert/strict';
import test from 'node:test';

import {
  resolveTrustedMediaUploadOrigin,
} from '@/lib/media-upload-origin';

const CONFIGURED_SITE_URL =
  'https://www.phclsuper.com';

test(
  'accepts request origin matching configured PHCL site origin',
  () => {
    assert.equal(
      resolveTrustedMediaUploadOrigin(
        'https://www.phclsuper.com',
        CONFIGURED_SITE_URL
      ),
      'https://www.phclsuper.com'
    );
  }
);

test(
  'normalizes configured PHCL site URL to its origin',
  () => {
    assert.equal(
      resolveTrustedMediaUploadOrigin(
        'https://www.phclsuper.com',
        'https://www.phclsuper.com/'
      ),
      'https://www.phclsuper.com'
    );
  }
);

test(
  'rejects missing request origin',
  () => {
    assert.throws(
      () =>
        resolveTrustedMediaUploadOrigin(
          null,
          CONFIGURED_SITE_URL
        ),
      /MEDIA_UPLOAD_ORIGIN_FORBIDDEN/
    );
  }
);

test(
  'rejects request origin different from configured PHCL origin',
  () => {
    assert.throws(
      () =>
        resolveTrustedMediaUploadOrigin(
          'https://evil.example',
          CONFIGURED_SITE_URL
        ),
      /MEDIA_UPLOAD_ORIGIN_FORBIDDEN/
    );
  }
);

test(
  'rejects missing configured site URL',
  () => {
    assert.throws(
      () =>
        resolveTrustedMediaUploadOrigin(
          'https://www.phclsuper.com',
          undefined
        ),
      /MEDIA_UPLOAD_ORIGIN_CONFIGURATION_INVALID/
    );
  }
);

test(
  'rejects unsafe configured site URL',
  () => {
    const unsafeConfiguredUrls = [
      'http://www.phclsuper.com',
      'https://user:pass@www.phclsuper.com',
      'https://www.phclsuper.com/?source=test',
      'https://www.phclsuper.com/#fragment',
      'not-a-url',
    ];

    for (
      const configuredSiteUrl
      of unsafeConfiguredUrls
    ) {
      assert.throws(
        () =>
          resolveTrustedMediaUploadOrigin(
            'https://www.phclsuper.com',
            configuredSiteUrl
          ),
        /MEDIA_UPLOAD_ORIGIN_CONFIGURATION_INVALID/
      );
    }
  }
);

test(
  'rejects malformed request origin',
  () => {
    const unsafeRequestOrigins = [
      '',
      ' https://www.phclsuper.com',
      'https://www.phclsuper.com ',
      'http://www.phclsuper.com',
      'https://user:pass@www.phclsuper.com',
      'https://www.phclsuper.com/path',
      'https://www.phclsuper.com?query=1',
      'not-a-url',
    ];

    for (
      const requestOrigin
      of unsafeRequestOrigins
    ) {
      assert.throws(
        () =>
          resolveTrustedMediaUploadOrigin(
            requestOrigin,
            CONFIGURED_SITE_URL
          ),
        /MEDIA_UPLOAD_ORIGIN_FORBIDDEN/
      );
    }
  }
);