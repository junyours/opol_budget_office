import { RememberedAccount } from '../types/api';

const STORAGE_KEY  = 'remembered_accounts';
const EXPIRY_DAYS  = 90;
const EXPIRY_MS    = EXPIRY_DAYS * 24 * 60 * 60 * 1000;

export function getRememberedAccounts(): RememberedAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const accounts: RememberedAccount[] = JSON.parse(raw);
    const now = Date.now();
    // Filter out expired ones and persist the pruned list
    const valid = accounts.filter(a => now - a.saved_at < EXPIRY_MS);
    if (valid.length !== accounts.length) saveAll(valid);
    return valid;
  } catch {
    return [];
  }
}

function saveAll(accounts: RememberedAccount[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

export function rememberAccount(account: RememberedAccount) {
  const existing = getRememberedAccounts().filter(a => a.user_id !== account.user_id);
  saveAll([{ ...account, saved_at: Date.now() }, ...existing]);
}

export function forgetAccount(user_id: number) {
  saveAll(getRememberedAccounts().filter(a => a.user_id !== user_id));
}
