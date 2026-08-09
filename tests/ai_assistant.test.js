/**
 * Automated Tests for Multilingual AI Assistant Engine (Swahili, English, French, Chinese)
 */

const assert = require('assert');
const { AIAssistantEngine } = require('../ai_assistant_engine');

describe('Multilingual AI Assistant Response Tests', () => {
  let aiEngine;

  beforeEach(() => {
    aiEngine = new AIAssistantEngine();
  });

  test('Provides Swahili (sw) response for KYC query', () => {
    const res = aiEngine.getResponse('Nionyeshe jinsi ya kufanya KYC NIDA', 'sw');
    assert(res.includes('KYC ina viwango vitatu'), 'Should return Swahili KYC guidance');
  });

  test('Provides English (en) response for Marketplace selling query', () => {
    const res = aiEngine.getResponse('How do I sell products in marketplace?', 'en');
    assert(res.includes('TIER 2 KYC VERIFIED'), 'Should return English Marketplace guidance');
  });

  test('Provides French (fr) response for security query', () => {
    const res = aiEngine.getResponse('Quelle est la sécurité du système?', 'fr');
    assert(res.includes('chiffrement AES-256'), 'Should return French security guidance');
  });

  test('Provides Chinese / Mandarin (zh) response for KYC query', () => {
    const res = aiEngine.getResponse('如何完成KYC身份验证？', 'zh');
    assert(res.includes('KYC身份验证包含三个级别'), 'Should return Chinese KYC guidance');
  });
});
