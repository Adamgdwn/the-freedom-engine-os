export interface ContactCaptureCandidate {
  fullName: string;
  email: string;
  organization: string | null;
  title: string | null;
  relationshipContext: string | null;
  notes: string | null;
}

const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const NAME_FIELD_REGEX = /\b(?:name|full name)\s*[:=-]\s*([^\n,]+(?:\s+[^\n,]+){0,4})/i;
const ORG_FIELD_REGEX = /\b(?:company|organization|org)\s*[:=-]\s*([^\n]+)$/im;
const TITLE_FIELD_REGEX = /\b(?:title|role|position)\s*[:=-]\s*([^\n]+)$/im;
const REL_FIELD_REGEX = /\b(?:relationship|context|how i know them)\s*[:=-]\s*([^\n]+)$/im;
const CONTACT_INTENT_REGEX = /\b(?:contact|contacts|email|e-mail|reach|save|add|remember)\b/i;

export function parseContactCaptureText(text: string): ContactCaptureCandidate | null {
  const normalized = text.trim();
  if (!normalized || normalized.length > 4000) {
    return null;
  }

  const email = normalized.match(EMAIL_REGEX)?.[0]?.toLowerCase() ?? null;
  if (!email) {
    return null;
  }

  const name = extractName(normalized, email);
  if (!name || name.split(/\s+/).length < 2) {
    return null;
  }

  const title = extractField(normalized, TITLE_FIELD_REGEX) ?? extractTitleFromCommaLine(normalized, name, email);
  const organization = extractField(normalized, ORG_FIELD_REGEX) ?? extractOrganization(normalized, name, email);
  const relationshipContext = extractField(normalized, REL_FIELD_REGEX);
  const notes = buildNotes(normalized, {
    name,
    email,
    title,
    organization,
    relationshipContext,
  });

  if (!CONTACT_INTENT_REGEX.test(normalized) && !looksLikeContactCard(normalized, name, email)) {
    return null;
  }

  return {
    fullName: name,
    email,
    organization,
    title,
    relationshipContext,
    notes,
  };
}

function extractField(text: string, pattern: RegExp): string | null {
  const value = text.match(pattern)?.[1]?.trim();
  return value ? cleanValue(value) : null;
}

function extractName(text: string, email: string): string | null {
  const labeled = extractField(text, NAME_FIELD_REGEX);
  if (labeled) {
    return labeled;
  }

  const firstLine = text
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean);
  if (firstLine && !firstLine.includes('@')) {
    const beforeComma = cleanValue(firstLine.split(',')[0] ?? '');
    if (isLikelyPersonName(beforeComma)) {
      return beforeComma;
    }
  }

  const emailIndex = text.toLowerCase().indexOf(email.toLowerCase());
  if (emailIndex > 0) {
    const nearby = cleanValue(text.slice(Math.max(0, emailIndex - 80), emailIndex).split('\n').pop() ?? '');
    const candidate = cleanValue(nearby.split(',')[0] ?? nearby);
    if (isLikelyPersonName(candidate)) {
      return candidate;
    }
  }

  const nameMatch = text.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b/);
  return nameMatch?.[1] && isLikelyPersonName(nameMatch[1]) ? cleanValue(nameMatch[1]) : null;
}

function extractTitleFromCommaLine(text: string, name: string, email: string): string | null {
  const line = text.split('\n').find((currentLine) => currentLine.includes(email)) ?? text;
  const parts = line.split(',').map((part) => cleanValue(part)).filter(Boolean);
  const filtered = parts.filter((part) => part.toLowerCase() !== name.toLowerCase() && !part.includes('@'));
  return filtered[0] ?? null;
}

function extractOrganization(text: string, name: string, email: string): string | null {
  const atMatch = text.match(/\b(?:at|with)\s+([A-Z][A-Za-z0-9&.' -]{2,})/);
  if (atMatch?.[1]) {
    return cleanValue(atMatch[1]);
  }

  const line = text.split('\n').find((currentLine) => currentLine.includes(email)) ?? text;
  const parts = line.split(',').map((part) => cleanValue(part)).filter(Boolean);
  const filtered = parts.filter((part) => {
    const lower = part.toLowerCase();
    return lower !== name.toLowerCase() && !part.includes('@');
  });

  return filtered.length > 1 ? filtered[1] : null;
}

function buildNotes(
  text: string,
  fields: {
    name: string;
    email: string;
    title: string | null;
    organization: string | null;
    relationshipContext: string | null;
  },
): string | null {
  const stripped = text
    .replace(fields.name, '')
    .replace(fields.email, '')
    .replace(fields.title ?? '', '')
    .replace(fields.organization ?? '', '')
    .replace(fields.relationshipContext ?? '', '')
    .replace(NAME_FIELD_REGEX, '')
    .replace(ORG_FIELD_REGEX, '')
    .replace(TITLE_FIELD_REGEX, '')
    .replace(REL_FIELD_REGEX, '')
    .replace(/\s+/g, ' ')
    .trim();

  const notes = cleanValue(stripped.replace(/^[,;:\-]+|[,;:\-]+$/g, '').trim());
  return notes && notes.length > 8 ? notes : null;
}

function looksLikeContactCard(text: string, name: string, email: string) {
  return text.includes('\n') || (text.includes(',') && text.toLowerCase().includes(email.toLowerCase()) && text.includes(name));
}

function isLikelyPersonName(value: string) {
  const normalized = cleanValue(value);
  if (!normalized || normalized.length < 5 || normalized.length > 80) {
    return false;
  }

  if (/@|\d/.test(normalized)) {
    return false;
  }

  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length < 2 || parts.length > 4) {
    return false;
  }

  return parts.every((part) => /^[A-Z][A-Za-z'’-]+$/.test(part));
}

function cleanValue(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}
