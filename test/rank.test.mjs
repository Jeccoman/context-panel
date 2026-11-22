import test from 'node:test';
import assert from 'node:assert/strict';
import { rankSimilar, topPeople } from '../src/lib/rank.js';
import { adfToText, searchTerms, tokenize } from '../src/lib/text.js';

const target = { key: 'APP-9', summary: 'Login times out after password reset', description: 'Users get a session timeout on the login page right after resetting their password.', components: ['auth'], labels: [], project: 'APP' };
const candidates = [
  { key: 'APP-1', summary: 'Session timeout on login after password reset', description: 'Token expiry too short', components: ['auth'], labels: [], project: 'APP', statusCategory: 'done', assignee: { accountId: 'a', displayName: 'Asha' } },
  { key: 'APP-2', summary: 'Dark mode colors wrong on settings page', description: '', components: ['ui'], labels: [], project: 'APP', statusCategory: 'done', assignee: { accountId: 'b', displayName: 'Baraka' } },
  { key: 'APP-3', summary: 'Password reset email not sent', description: 'SMTP config', components: ['auth'], labels: [], project: 'APP', statusCategory: 'done', assignee: { accountId: 'a', displayName: 'Asha' } },
  { key: 'WEB-4', summary: 'Login button misaligned', description: '', components: [], labels: [], project: 'WEB', statusCategory: 'indeterminate', assignee: null },
];

test('ranks the closest past issue first and drops unrelated ones', () => {
  const ranked = rankSimilar(target, candidates);
  assert.equal(ranked[0].key, 'APP-1');
  assert.ok(!ranked.some((r) => r.key === 'APP-2'));
  assert.ok(ranked[0].match > ranked[ranked.length - 1].match);
  assert.ok(ranked.every((r) => r.match >= 0 && r.match <= 1));
});

test('returns nothing for an empty target', () => {
  assert.deepEqual(rankSimilar({ summary: 'the a an', description: '' }, candidates), []);
});

test('counts people across results', () => {
  const people = topPeople(rankSimilar(target, candidates));
  assert.equal(people[0].accountId, 'a');
  assert.equal(people[0].count, 2);
});

test('tokenize stems and removes stopwords', () => {
  assert.deepEqual(tokenize('The logins are timing out'), ['login', 'tim']);
});

test('searchTerms keeps original words, deduped by stem', () => {
  assert.deepEqual(searchTerms('login logins timeout reset the', 6), ['login', 'timeout', 'reset']);
});

test('adfToText flattens paragraphs', () => {
  const doc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }, { type: 'paragraph', content: [{ type: 'text', text: 'world' }] }] };
  assert.match(adfToText(doc), /Hello\n+world/);
});
