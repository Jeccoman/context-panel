const GROUPS = [
  ['login', 'log in', 'logon', 'sign in', 'signin', 'signing in', 'sign on', 'authenticate', 'authentication'],
  ['logout', 'log out', 'logged out', 'logging out', 'sign out', 'signed out', 'signing out', 'kicked out', 'kicks out', 'session expire', 'session expires', 'session expiring', 'expired session'],
  ['password', 'passcode', 'passphrase', 'credentials', 'credential', 'pin code'],
  ['sso', 'single sign on', 'single sign-on', 'saml', 'okta', 'identity provider', 'idp', 'oauth', 'openid'],
  ['2fa', 'mfa', 'two factor', 'two-factor', 'multi factor', 'totp', 'one time passcode', 'one time password', 'otp', 'authenticator'],
  ['ios', 'iphone', 'ipad', 'apple'],
  ['android', 'samsung', 'pixel'],
  ['mobile', 'phone', 'handset', 'smartphone', 'cellphone'],
  ['charge', 'charged', 'billed', 'bill', 'debited', 'debit', 'payment', 'paid', 'pay'],
  ['duplicate', 'duplicated', 'twice', 'double', 'two times', 'in pairs', 'repeated'],
  ['refund', 'refunded', 'reversal', 'reverse', 'money back', 'credited back', 'chargeback', 'gave back', 'returning funds'],
  ['currency', 'money symbol', 'usd', 'dollars', 'dollar', 'kes', 'shillings', 'shilling', 'ugx', 'tzs', 'euro', 'eur', 'gbp'],
  ['mpesa', 'm-pesa', 'mobile money', 'safaricom', 'airtel money', 'wallet'],
  ['order', 'purchase', 'basket', 'cart', 'checkout', 'sale'],
  ['customer', 'shopper', 'buyer', 'client'],
  ['merchant', 'seller', 'vendor', 'store owner'],
  ['carrier', 'courier', 'dhl', 'ups', 'fedex', 'shipping provider', 'logistics provider'],
  ['label', 'waybill', 'airway bill', 'shipping sticker', 'sticker', 'consignment note'],
  ['parcel', 'package', 'shipment', 'box', 'boxes', 'consignment'],
  ['weight', 'heavy', 'kilogram', 'kilograms', 'kg', 'big', 'oversized', 'freight'],
  ['rate', 'rates', 'quote', 'quoted', 'price', 'pricing', 'cost', 'priced'],
  ['surcharge', 'surcharges', 'extra fee', 'extra fees', 'fee', 'fees', 'accessorial'],
  ['invoice', 'courier bill', 'carrier bill', 'statement'],
  ['reconcile', 'reconciliation', 'line up', 'match up', 'tied to', 'matched'],
  ['delivered', 'arrived', 'reached the customer', 'received'],
  ['tracking', 'track', 'status page', 'shipment page'],
  ['address', 'street', 'address line'],
  ['email', 'e-mail', 'mail', 'emails', 'message'],
  ['spam', 'junk', 'unwanted mail', 'promotions tab'],
  ['receipt', 'confirmation', 'order confirmation'],
  ['sms', 'text message', 'text messages', 'texts', 'texting'],
  ['push', 'push notification', 'alert', 'alerts', 'notification', 'notifications'],
  ['reset', 'forgot password', 'recovery', 'recover'],
  ['search', 'lookup', 'find', 'finder', 'query', 'results'],
  ['accent', 'accents', 'accented', 'diacritic', 'diacritics', 'special letters', 'special characters', 'non english'],
  ['out of stock', 'sold out', 'unavailable', 'not available'],
  ['slow', 'slowdown', 'crawls', 'lag', 'laggy', 'takes ages', 'takes forever', 'timeout', 'times out', 'timed out', 'latency', 'performance'],
  ['sale', 'sales', 'promotion', 'promotions', 'flash sale', 'black friday', 'campaign', 'heavy traffic', 'peak'],
  ['export', 'download', 'downloaded', 'csv', 'spreadsheet', 'excel', 'xlsx'],
  ['truncated', 'cut off', 'cuts off', 'partial', 'incomplete', 'only part', 'missing rows'],
  ['garbled', 'broken characters', 'weird symbols', 'mojibake', 'encoding', 'utf-8', 'utf8'],
  ['database', 'db', 'postgres', 'mysql', 'sql'],
  ['cpu', 'maxed out', 'load', 'resources'],
  ['nightly', 'overnight', 'every night', 'at night', 'cron', 'scheduled job'],
  ['blank', 'empty', 'nothing appears', 'white page'],
  ['print', 'printing', 'printed', 'printer', 'paper'],
];

const PHRASES = new Map();
for (const group of GROUPS) {
  const canon = `~${group[0].replace(/[^a-z0-9]+/g, '_')}`;
  for (const term of group) PHRASES.set(term.toLowerCase(), canon);
}

const MAX_WORDS = Math.max(...[...PHRASES.keys()].map((k) => k.split(' ').length));

export function analyzeConcepts(text) {
  const words = (text || '').toLowerCase().replace(/[^a-z0-9\s-]+/g, ' ').split(/\s+/).filter(Boolean);
  const concepts = [];
  const covered = new Set();
  for (let i = 0; i < words.length; i++) {
    for (let len = Math.min(MAX_WORDS, words.length - i); len >= 1; len--) {
      const phrase = words.slice(i, i + len).join(' ');
      const canon = PHRASES.get(phrase);
      if (canon) {
        concepts.push(canon);
        for (const w of phrase.split(/[\s-]+/)) covered.add(w);
        i += len - 1;
        break;
      }
    }
  }
  return { concepts, covered };
}

export function conceptTokens(text) {
  return analyzeConcepts(text).concepts;
}

export function synonymsFor(word) {
  const canon = PHRASES.get((word || '').toLowerCase());
  if (!canon) return [];
  const group = GROUPS.find((g) => `~${g[0].replace(/[^a-z0-9]+/g, '_')}` === canon) || [];
  return group.filter((t) => !t.includes(' ') && t !== word.toLowerCase());
}
