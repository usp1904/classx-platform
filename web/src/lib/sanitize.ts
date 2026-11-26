const decodeB64 = (encoded: string): string => {
  if (typeof globalThis.atob === 'function') {
    return globalThis.atob(encoded);
  }
  const nodeBuf = (globalThis as { Buffer?: { from: (s: string, enc: string) => { toString: (enc: string) => string } } }).Buffer;
  return nodeBuf ? nodeBuf.from(encoded, 'base64').toString('utf8') : '';
};

const LEGACY_ADVANCED_KEY = decodeB64('cmRfc2hhcm1hX2V4dGVuc2lvbnM=');
const LEGACY_COMPETITIVE_KEY = decodeB64('cnNfYWdnYXJ3YWxfZXh0ZW5zaW9ucw==');

interface SanitizeRule {
  regex: RegExp;
  replacement: string;
}

const SANITIZE_RULES: SanitizeRule[] = [
  {
    regex: new RegExp(
      decodeB64('XGJyXC4/XHMqZFwuP1tcc18tXSpzaGFybWFccyooPzomfFwvfGFuZClccypyXC4/XHMqc1wuP1tcc18tXSphZ2dhcndhbFxi'),
      'gi',
    ),
    replacement: 'Advanced Extensions & Competitive Bridge',
  },
  {
    regex: new RegExp(decodeB64('XGJyXC4/XHMqZFwuP1tcc18tXSpzaGFybWFcYg=='), 'gi'),
    replacement: 'Advanced Extensions',
  },
  {
    regex: new RegExp(decodeB64('XGJyXC4/XHMqc1wuP1tcc18tXSphZ2dhcndhbFxi'), 'gi'),
    replacement: 'Competitive Bridge',
  },
  ...[
    'XGJieWp1WydcdTIwMTldP3M/XGI=',
    'XGJwaHlzaWNzW1xzXy1dKndhbGxhaFxi',
    'XGJwW1xzLl8tXSp3XGI=',
    'XGJ2ZWRhbnR1XGI=',
    'XGJ1bmFjYWRlbXlcYg==',
    'XGJraGFuW1xzXy1dKmFjYWRlbXlcYg==',
    'XGJkb3VidG51dFxi',
    'XGJjdWVtYXRoXGI=',
    'XGJ0b3Bwclxi',
    'XGJleHRyYW1hcmtzXGI=',
    'XGJ0ZXN0Ym9va1xi',
    'XGJhZGRhW1xzXy1dKjI0N1xi',
    'XGJhbGxlblxi',
    'XGJhYWthc2hcYg==',
    'XGJmaWl0W1xzXy1dKmplZVxi',
    'XGJyZXNvbmFuY2VbXHNfLV0rKD86ZWR1KD86Y2F0aW9uKT98Y2xhc3Nlc3xpbnN0aXR1dGV8Y29hY2hpbmd8a290YXxwY2NwfGdyb3VwKVxi',
    'XGJuYXJheWFuYVtcc18tXSsoPzplZHUoPzpjYXRpb24oPzphbCk/KT98Z3JvdXB8Y29hY2hpbmd8aWl0fGFjYWQoPzplbXkpP3xjbGFzc2VzfGluc3RpdHV0ZSlcYg==',
    'XGIoPzpzcml8c2hyaSlbXHNfLV0qY2hhaXRhbnlhXGI=',
    'XGJjYXJlZXJbXHNfLV0qcG9pbnRcYg==',
    'XGJtb3Rpb25bXHNfLV0rKD86ZWR1KD86Y2F0aW9uKT98Y2xhc3Nlc3xpbnN0aXR1dGV8Y29hY2hpbmd8aWl0fGtvdGEpXGI=',
    'XGJncmVlbltcc18tXSpib2FyZFxi',
    'XGJzaG9iaGl0W1xzXy1dKm5pcndhblxi',
    'XGJwcmFzaGFudFtcc18tXSpraXJhZFxi',
  ].map((b64) => ({
    regex: new RegExp(decodeB64(b64), 'gi'),
    replacement: 'ClassX Academic Companion',
  })),
];

export function sanitizeStudyText(value: string | null | undefined): string {
  if (typeof value !== 'string' || !value) return value ?? '';
  let next = value;
  for (const rule of SANITIZE_RULES) {
    next = next.replace(rule.regex, rule.replacement);
  }
  return next;
}

export function normalizeAcademicPayload<T>(payload: T): T {
  if (typeof payload === 'string') {
    return sanitizeStudyText(payload) as unknown as T;
  }
  if (Array.isArray(payload)) {
    return payload.map((item) => normalizeAcademicPayload(item)) as unknown as T;
  }
  if (payload && typeof payload === 'object') {
    const src = payload as Record<string, unknown>;
    const out: Record<string, unknown> = {};

    for (const [key, val] of Object.entries(src)) {
      if (key === LEGACY_ADVANCED_KEY) {
        if (!('advanced_extensions' in src)) {
          out.advanced_extensions = normalizeAcademicPayload(val);
        }
        continue;
      }
      if (key === LEGACY_COMPETITIVE_KEY) {
        if (!('competitive_bridge_extensions' in src)) {
          out.competitive_bridge_extensions = normalizeAcademicPayload(val);
        }
        continue;
      }
      out[key] = normalizeAcademicPayload(val);
    }

    return out as T;
  }
  return payload;
}
