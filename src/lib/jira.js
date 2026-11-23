import api, { route } from '@forge/api';
import { adfToText, searchTerms, snippet } from './text.js';
import { rankSimilar, topPeople } from './rank.js';
import { synonymsFor } from './concepts.js';

const FIELDS = ['summary', 'description', 'status', 'resolution', 'resolutiondate', 'assignee', 'components', 'labels', 'project', 'updated'];

function normalize(raw) {
  const f = raw.fields || {};
  return {
    key: raw.key,
    summary: f.summary || '',
    description: adfToText(f.description),
    status: f.status?.name || '',
    statusCategory: f.status?.statusCategory?.key || '',
    resolution: f.resolution?.name || null,
    resolvedAt: f.resolutiondate || null,
    updatedAt: f.updated || null,
    project: f.project?.key || null,
    components: (f.components || []).map((c) => c.name),
    labels: f.labels || [],
    assignee: f.assignee
      ? { accountId: f.assignee.accountId, displayName: f.assignee.displayName }
      : null,
  };
}

async function jiraJson(res) {
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Jira API ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

export async function getIssue(issueKey) {
  const res = await api
    .asUser()
    .requestJira(route`/rest/api/3/issue/${issueKey}?fields=${FIELDS.join(',')}`);
  return normalize(await jiraJson(res));
}

export async function getComments(issueKey, max = 3) {
  const res = await api
    .asUser()
    .requestJira(route`/rest/api/3/issue/${issueKey}/comment?orderBy=-created&maxResults=${max}`);
  const data = await jiraJson(res);
  return (data.comments || []).map((c) => ({
    author: c.author?.displayName || 'Unknown',
    createdAt: c.created,
    text: snippet(adfToText(c.body), 600),
  }));
}

export async function searchCandidates(target, max = 50) {
  const words = searchTerms(`${target.summary} ${target.description}`, 6);
  const terms = [...new Set([...words, ...words.flatMap(synonymsFor)])]
    .filter((t) => /^[a-z0-9]+$/.test(t))
    .slice(0, 20);
  const clauses = terms.map((t) => `text ~ "${t}"`);
  if (target.components.length && target.project) {
    const names = target.components.map((c) => `"${c.replace(/["\\]/g, '')}"`).join(', ');
    clauses.push(`(project = ${target.project} AND component in (${names}) AND statusCategory = Done)`);
  }
  if (clauses.length === 0) return [];
  const exclude = target.key === 'NONE-0' ? '' : `key != ${target.key} AND `;
  const jql = `${exclude}(${clauses.join(' OR ')}) ORDER BY updated DESC`;
  const res = await api.asUser().requestJira(route`/rest/api/3/search/jql`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ jql, maxResults: max, fields: FIELDS }),
  });
  const data = await jiraJson(res);
  return (data.issues || []).map(normalize);
}

export async function latestComment(issueKey) {
  const res = await api
    .asUser()
    .requestJira(route`/rest/api/3/issue/${issueKey}/comment?orderBy=-created&maxResults=1`);
  const data = await jiraJson(res);
  const comment = (data.comments || [])[0];
  if (!comment) return null;
  return {
    author: comment.author?.displayName || 'Unknown',
    createdAt: comment.created,
    text: snippet(adfToText(comment.body)),
  };
}

export async function buildContext(issueKey) {
  return buildContextFor(await getIssue(issueKey));
}

export function targetFromText(text, { project = null, components = [] } = {}) {
  const clean = (text || '').trim();
  const [first, ...rest] = clean.split(/(?<=[.!?\n])\s+/);
  return {
    key: 'NONE-0',
    summary: first || clean,
    description: rest.join(' '),
    project,
    components,
    labels: [],
  };
}

export async function buildContextFor(target) {
  const issueKey = target.key === 'NONE-0' ? null : target.key;
  const candidates = await searchCandidates(target);
  const ranked = rankSimilar(target, candidates, { limit: 15 });

  const resolved = ranked.filter((r) => r.statusCategory === 'done').slice(0, 5);
  const inFlight = ranked.filter((r) => r.statusCategory !== 'done' && r.match >= 0.35).slice(0, 3);

  const notes = await Promise.all(resolved.slice(0, 3).map((r) => latestComment(r.key).catch(() => null)));
  resolved.forEach((r, i) => {
    r.lastComment = notes[i] || null;
  });

  return {
    issueKey,
    searchedCount: candidates.length,
    resolved: resolved.map(trim),
    inFlight: inFlight.map(trim),
    people: topPeople(ranked.filter((r) => r.statusCategory === 'done')),
  };
}

function trim(r) {
  return {
    key: r.key,
    summary: r.summary,
    status: r.status,
    resolution: r.resolution,
    resolvedAt: r.resolvedAt,
    assignee: r.assignee,
    match: Math.round(r.match * 100),
    sharedTerms: r.sharedTerms.slice(0, 5),
    sharedComponents: r.sharedComponents,
    lastComment: r.lastComment || null,
  };
}
