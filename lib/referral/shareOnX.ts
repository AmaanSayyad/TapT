/**
 * Canonical X/Twitter share copy for referral links (used from /referrals and /profile).
 */

export function getReferralShareTweetText(): string {
  return [
    'THIS PLATFORM IS INSANE.⚡️',
    '',
    'TapT.fun - short charts for crypto, stocks, metals, and FX. Rounds run from 5 seconds to 1 minute.',
    '',
    'Open TapT from my link and the join is counted on my wallet.',
    '',
    'Stop watching. Start trading.', 
    '',
    'Try it now: 🔥👇',
    ].join('\n');
}

export function referralLandingUrl(referralCode: string): string {
  return `https://tapt.fun/?ref=${encodeURIComponent(referralCode.trim())}`;
}

export function openReferralShareOnX(referralLink: string): void {
  if (typeof window === 'undefined') return;
  const text = encodeURIComponent(getReferralShareTweetText());
  window.open(
    `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(referralLink)}`,
    '_blank',
  );
}
