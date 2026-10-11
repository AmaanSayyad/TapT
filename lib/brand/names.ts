/** Strip the old platform name from anything a person can see. */

export function displayUsername(name: string | null | undefined): string | null {
  if (!name) return name ?? null;
  return name.replace(/\.(bynomo|tapt)$/i, '');
}

export function displayReferralCode(code: string | null | undefined): string | null {
  if (!code) return code ?? null;
  return code.replace(/^bynomo-/i, 'tapt-');
}

/** Stored codes may still use the old prefix. Look up both. */
export function referralCodeLookups(code: string): string[] {
  const trimmed = code.trim();
  const out = new Set<string>([trimmed]);
  if (/^tapt-/i.test(trimmed)) out.add(trimmed.replace(/^tapt-/i, 'bynomo-'));
  if (/^bynomo-/i.test(trimmed)) out.add(trimmed.replace(/^bynomo-/i, 'tapt-'));
  return [...out];
}
