import { readFileSync } from 'node:fs';
import { rankSimilar } from '../src/lib/rank.js';
import { searchTerms, tokenize } from '../src/lib/text.js';

const issues = JSON.parse(readFileSync(new URL('../data/issues.json', import.meta.url)));
const queries = JSON.parse(readFileSync(new URL('../data/queries.json', import.meta.url)));
const verbose = process.argv.includes('--verbose');

const corpus = issues.map((i) => ({
  key: i.id,
  summary: i.summary,
  description: i.description,
  components: [i.component],
  labels: [],
  project: 'SHOP',
  statusCategory: i.status === 'Done' ? 'done' : 'indeterminate',
  resolution: i.resolution || null,
}));

function prefilter(target) {
  const terms = new Set(searchTerms(`${target.summary} ${target.description}`, 6).flatMap(tokenize));
  return corpus.filter((c) => tokenize(`${c.summary} ${c.description}`).some((t) => terms.has(t)));
}

let hit1 = 0, hit3 = 0, rr = 0;
for (const q of queries) {
  const target = { key: 'NEW-1', ...q, components: [q.component], labels: [], project: 'SHOP' };
  const ranked = rankSimilar(target, prefilter(target), { limit: 15 })
    .filter((r) => r.statusCategory === 'done' && r.resolution !== 'Duplicate');
  const keys = ranked.map((r) => r.key);
  const rank = keys.findIndex((k) => q.expected.includes(k)) + 1;
  if (rank === 1) hit1++;
  if (rank >= 1 && rank <= 3) hit3++;
  if (rank > 0) rr += 1 / rank;
  if (verbose || rank !== 1) console.log(`${rank === 1 ? 'ok  ' : 'MISS'} rank=${rank || '-'} "${q.summary}" -> ${keys.slice(0, 3).join(', ') || '(none)'}`);
}
const n = queries.length;
console.log(`\nqueries=${n}  top1=${(100 * hit1 / n).toFixed(1)}%  top3=${(100 * hit3 / n).toFixed(1)}%  MRR=${(rr / n).toFixed(3)}`);
