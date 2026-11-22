import Resolver from '@forge/resolver';
import { buildContext } from '../lib/jira.js';

const resolver = new Resolver();

resolver.define('getContext', async ({ context }) => {
  const issueKey = context.extension?.issue?.key;
  if (!issueKey) return { error: 'No issue in context.' };
  try {
    return await buildContext(issueKey);
  } catch (err) {
    console.error(err);
    return { error: 'Could not load context for this issue.' };
  }
});

export const handler = resolver.getDefinitions();
