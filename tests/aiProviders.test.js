'use strict';

const { configuredProviders, PROVIDER_DEFS } = require('../server/services/aiProviders');

describe('configuredProviders quota overrides', () => {
  test('unset override falls back to the provider default ceiling', () => {
    const env = { GEMINI_API_KEY: 'k' };
    const [gemini] = configuredProviders(env);
    expect(gemini.limits.requestsPerDay).toBe(PROVIDER_DEFS.gemini.limits.requestsPerDay);
    expect(gemini.limits.tokensPerDay).toBe(PROVIDER_DEFS.gemini.limits.tokensPerDay);
  });

  test('an empty-string override (e.g. an uncommented but blank .env line) also falls back to the default, not to "no ceiling"', () => {
    const env = {
      GEMINI_API_KEY: 'k',
      GEMINI_REQUESTS_PER_DAY: '',
      GEMINI_TOKENS_PER_DAY: '',
      GROQ_API_KEY: 'k',
      GROQ_REQUESTS_PER_DAY: '',
      GROQ_TOKENS_PER_DAY: '',
    };
    const providers = configuredProviders(env);
    const gemini = providers.find(p => p.id === 'gemini');
    const groq = providers.find(p => p.id === 'groq');
    expect(gemini.limits.requestsPerDay).toBe(PROVIDER_DEFS.gemini.limits.requestsPerDay);
    expect(gemini.limits.tokensPerDay).toBe(PROVIDER_DEFS.gemini.limits.tokensPerDay);
    expect(groq.limits.requestsPerDay).toBe(PROVIDER_DEFS.groq.limits.requestsPerDay);
    expect(groq.limits.tokensPerDay).toBe(PROVIDER_DEFS.groq.limits.tokensPerDay);
  });

  test('a real numeric override is still honored', () => {
    const env = { GEMINI_API_KEY: 'k', GEMINI_REQUESTS_PER_DAY: '5' };
    const [gemini] = configuredProviders(env);
    expect(gemini.limits.requestsPerDay).toBe(5);
  });

  test('a non-whole-number override falls back to the default ceiling', () => {
    const env = {
      GEMINI_API_KEY: 'k',
      GEMINI_REQUESTS_PER_DAY: '5.5',
      GEMINI_TOKENS_PER_DAY: 'not-a-number',
    };
    const [gemini] = configuredProviders(env);
    expect(gemini.limits.requestsPerDay).toBe(PROVIDER_DEFS.gemini.limits.requestsPerDay);
    expect(gemini.limits.tokensPerDay).toBe(PROVIDER_DEFS.gemini.limits.tokensPerDay);
  });
});
