const STOPWORDS = new Set(
  `a about above after again against all also am an and any are as at be because been before being below between both but by can cannot could did do does doing down during each few for from further had has have having he her here hers him his how i if in into is it its itself just me more most my no nor not now of off on once only or other our ours out over own same she should so some such than that the their theirs them then there these they this those through to too under until up very was we were what when where which while who whom why will with would you your yours
  issue issues bug bugs error errors problem problems please need needs want wants when get gets got make makes made use used using work works working fix fixed fixes add added update updated new old should would could cannot can't doesn't isn't won't does don't`.split(/\s+/)
);

export function adfToText(node) {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (node.type === 'text') return node.text || '';
  if (node.type === 'hardBreak') return '\n';
  const children = (node.content || []).map(adfToText).join(node.type === 'doc' ? '\n' : '');
  const blocks = new Set(['paragraph', 'heading', 'listItem', 'codeBlock', 'blockquote']);
  return blocks.has(node.type) ? `${children}\n` : children;
}

function stem(word) {
  if (word.length > 5 && word.endsWith('ing')) return word.slice(0, -3);
  if (word.length > 4 && word.endsWith('ed')) return word.slice(0, -2);
  if (word.length > 4 && word.endsWith('es')) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

export function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w) && !/^\d+$/.test(w))
    .map(stem);
}

export function searchTerms(text, limit = 6) {
  const seen = new Set();
  const terms = [];
  for (const word of (text || '').toLowerCase().split(/[^a-z0-9]+/)) {
    if (word.length < 3 || STOPWORDS.has(word) || /^\d+$/.test(word)) continue;
    const key = stem(word);
    if (seen.has(key)) continue;
    seen.add(key);
    terms.push(word);
    if (terms.length === limit) break;
  }
  return terms;
}

export function snippet(text, max = 220) {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}
