import { stemDisplayMap, tokenize } from './text.js';
import { analyzeConcepts } from './concepts.js';

function termCounts(tokens) {
  const counts = new Map();
  for (const t of tokens) counts.set(t, (counts.get(t) || 0) + 1);
  return counts;
}

function textTokens(text) {
  const { concepts, covered } = analyzeConcepts(text);
  const coveredStems = new Set(tokenize([...covered].join(' ')));
  return [...tokenize(text).filter((t) => !coveredStems.has(t)), ...concepts];
}

function issueTokens(issue) {
  const summary = textTokens(issue.summary);
  return [...summary, ...summary, ...textTokens(issue.description)];
}

function displayTerm(token, display) {
  if (token.startsWith('~')) return token.slice(1).replace(/_/g, ' ');
  return display.get(token) || token;
}

export function rankSimilar(target, candidates, { limit = 10, minRelevance = 0.15 } = {}) {
  const weights = new Map();
  for (const t of textTokens(target.description)) weights.set(t, 1);
  for (const t of textTokens(target.summary)) weights.set(t, 3);
  const queryTerms = new Set(weights.keys());
  if (queryTerms.size === 0 || candidates.length === 0) return [];

  const docs = candidates.map((c) => ({ issue: c, counts: termCounts(issueTokens(c)) }));
  const n = docs.length;
  const df = new Map();
  for (const { counts } of docs) {
    for (const t of counts.keys()) if (queryTerms.has(t)) df.set(t, (df.get(t) || 0) + 1);
  }
  const idf = (t) => Math.log(1 + (n + 1) / ((df.get(t) || 0) + 0.5));
  const maxScore = [...queryTerms].reduce((sum, t) => sum + weights.get(t) * idf(t), 0);

  const display = stemDisplayMap(`${target.summary} ${target.description}`);
  const targetComponents = new Set(target.components || []);
  const targetLabels = new Set(target.labels || []);

  return docs
    .map(({ issue, counts }) => {
      let score = 0;
      const shared = [];
      for (const t of queryTerms) {
        if (counts.has(t)) {
          score += weights.get(t) * idf(t);
          shared.push(t);
        }
      }
      const relevance = maxScore > 0 ? score / maxScore : 0;
      let match = relevance;
      const sharedComponents = (issue.components || []).filter((c) => targetComponents.has(c));
      const sharedLabels = (issue.labels || []).filter((l) => targetLabels.has(l));
      if (sharedComponents.length) match += 0.1;
      if (sharedLabels.length) match += 0.05;
      if (issue.project && issue.project === target.project) match += 0.05;
      return { ...issue, relevance, match: Math.min(1, match), sharedTerms: [...new Set(shared.map((t) => displayTerm(t, display)))], sharedComponents };
    })
    .filter((r) => r.relevance >= minRelevance)
    .sort((a, b) => b.match - a.match)
    .slice(0, limit);
}

export function topPeople(results, limit = 3) {
  const people = new Map();
  for (const r of results) {
    if (!r.assignee) continue;
    const entry = people.get(r.assignee.accountId) || { ...r.assignee, count: 0, issues: [] };
    entry.count += 1;
    entry.issues.push(r.key);
    people.set(r.assignee.accountId, entry);
  }
  return [...people.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}
