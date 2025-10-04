// Allowed Emails Whitelist
// Egyszerű whitelist ellenőrzés az onboardinghoz

// Itt add meg az engedélyezett email címeket
const ALLOWED_EMAILS = [
  'turoczi.adam@europa2000.hu',
  'vincze.attila@europa2000.hu'
];

/**
 * Ellenőrzi, hogy az email szerepel-e az engedélyezett listában
 * Visszatérési érték: Promise<boolean>
 */
export async function isEmailAllowed(email) {
  try {
    if (!email || typeof email !== 'string') return false;
    const normalized = email.trim().toLowerCase();
    return ALLOWED_EMAILS.map(e => e.toLowerCase()).includes(normalized);
  } catch (e) {
    console.error('allowed-emails.js hiba:', e);
    return false;
  }
}

export default { isEmailAllowed };