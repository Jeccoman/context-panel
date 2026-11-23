import { buildContext, buildContextFor, getComments, getIssue, targetFromText } from './lib/jira.js';

const ISSUE_KEY = /^[A-Z][A-Z0-9_]+-\d+$/;

function resolveIssueKey(payload) {
  const given = (payload.issueKey || '').trim().toUpperCase();
  if (ISSUE_KEY.test(given)) return given;
  const fromContext = payload.context?.jira?.issueKey;
  return fromContext && ISSUE_KEY.test(fromContext) ? fromContext : null;
}

function failure(err) {
  console.error(err);
  return { error: 'Jira could not be searched for this request. The issue may not exist or you may not have access to it.' };
}

export async function findSimilarIssues(payload) {
  try {
    const text = (payload.problem || '').trim();
    if (text) return await buildContextFor(targetFromText(text));
    const issueKey = resolveIssueKey(payload);
    if (!issueKey) return { error: 'Give an issue key like SHOP-12, or describe the problem in a sentence.' };
    return await buildContext(issueKey);
  } catch (err) {
    return failure(err);
  }
}

export async function getResolutionNotes(payload) {
  try {
    const issueKey = resolveIssueKey(payload);
    if (!issueKey) return { error: 'Give an issue key like SHOP-12.' };
    const [issue, comments] = await Promise.all([getIssue(issueKey), getComments(issueKey, 3)]);
    return {
      key: issue.key,
      summary: issue.summary,
      description: issue.description.slice(0, 1200),
      status: issue.status,
      resolution: issue.resolution,
      resolvedAt: issue.resolvedAt,
      assignee: issue.assignee?.displayName || null,
      components: issue.components,
      latestComments: comments,
    };
  } catch (err) {
    return failure(err);
  }
}

export async function findExperts(payload) {
  try {
    const topic = (payload.topic || '').trim();
    if (!topic) return { error: 'Describe the area, for example "M-Pesa refunds" or "DHL labels".' };
    const result = await buildContextFor(targetFromText(topic));
    return {
      topic,
      people: result.people.map((p) => ({ name: p.displayName, resolvedRelatedIssues: p.count, examples: p.issues.slice(0, 3) })),
      basedOn: result.resolved.map((r) => r.key),
    };
  } catch (err) {
    return failure(err);
  }
}
