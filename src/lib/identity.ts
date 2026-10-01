const reservedUsernames = new Set(["admin", "administrator", "root", "system", "support", "blocksystem"]);

export function normalizeEmail(value: string) { return value.trim().toLowerCase(); }
export function normalizeUsername(value: string) { return value.trim().toLowerCase(); }
export function validEmail(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254; }
export function validUsername(value: string) { return /^[a-z0-9](?:[a-z0-9._-]{1,29})$/.test(value) && !reservedUsernames.has(value); }
