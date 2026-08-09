/**
 * Automated Tests for Phase 4 Production Cloud Deployment Manifests
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

describe('Phase 4 Production Cloud Deployment Manifests Test Suite', () => {
  test('Verifies Dockerfile configuration and non-root security user', () => {
    const dockerfilePath = path.resolve(__dirname, '../Dockerfile');
    assert.strictEqual(fs.existsSync(dockerfilePath), true, 'Dockerfile must exist');

    const content = fs.readFileSync(dockerfilePath, 'utf8');
    assert.ok(content.includes('EXPOSE 3000'), 'Dockerfile exposes port 3000');
    assert.ok(content.includes('USER appuser'), 'Dockerfile uses non-root security user');
  });

  test('Verifies Firebase App Hosting manifest (apphosting.yaml)', () => {
    const yamlPath = path.resolve(__dirname, '../apphosting.yaml');
    assert.strictEqual(fs.existsSync(yamlPath), true, 'apphosting.yaml must exist');

    const content = fs.readFileSync(yamlPath, 'utf8');
    assert.ok(content.includes('minInstances: 1'), 'Specifies minimum 1 instance');
    assert.ok(content.includes('memoryMiB: 1024'), 'Specifies 1GiB memory allocation');
  });
});
