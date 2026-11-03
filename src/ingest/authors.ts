function stripNoise(name: string): string {
  return name
    .replace(/;?\s*id_orcid.*$/i, '')
    .replace(/;?\s*https?:\/\/orcid\.org\/.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function displayName(name: string): string {
  const cleaned = stripNoise(name);
  if (!cleaned.includes(',')) {
    return cleaned;
  }

  const [last, ...rest] = cleaned.split(',').map((part) => part.trim());
  const given = rest.join(' ').trim();
  if (!last || !given) {
    return cleaned;
  }

  return `${given} ${last}`;
}

function identityKey(name: string): string {
  const display = displayName(name)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '');
  const parts = display.split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '';
  }

  const last = parts[parts.length - 1];
  const firstInitial = parts[0][0] ?? '';
  return `${last}|${firstInitial}`;
}

export function uniqueAuthors(names: string[]): string[] {
  const chosen = new Map<string, string>();

  for (const raw of names) {
    const cleaned = stripNoise(raw);
    if (!cleaned || /^et al\.?$/i.test(cleaned)) {
      continue;
    }

    const key = identityKey(cleaned);
    if (!key) {
      continue;
    }

    const display = displayName(cleaned);
    const existing = chosen.get(key);
    if (!existing || display.length > existing.length) {
      chosen.set(key, display);
    }
  }

  return [...chosen.values()];
}
