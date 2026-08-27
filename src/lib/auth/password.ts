/**
 * Password hashing (SPEC-M7 §3) — scrypt via node:crypto, ZERO dependencies.
 * Node runtime ONLY (never import from middleware/edge code).
 *
 * Stored format: `scrypt$<salt-hex>$<hash-hex>` (N=16384, r=8, p=1, 64-byte key).
 * `passwordHash == null` on a User row means "cannot log in yet" (pre-ADR-017
 * rows bootstrap their password via /api/auth/bootstrap or scripts/seed_admin.ts).
 */
import { randomBytes, scrypt as _scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(_scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
) => Promise<Buffer>

const KEYLEN = 64
const COST: ScryptOptions = { N: 16384, r: 8, p: 1 }

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await scryptAsync(password, salt, KEYLEN, COST)
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false
  const parts = stored.split('$')
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false
  const salt = Buffer.from(parts[1], 'hex')
  const expected = Buffer.from(parts[2], 'hex')
  if (salt.length === 0 || expected.length === 0) return false
  const key = await scryptAsync(password, salt, expected.length, COST)
  return key.length === expected.length && timingSafeEqual(key, expected)
}

/** Dummy hash for timing-safe "user not found" paths (constant-ish response time). */
const DUMMY_HASH =
  'scrypt$' + '00'.repeat(16) + '$' + '00'.repeat(64)

export async function burnDummyPassword(password: string): Promise<void> {
  await verifyPassword(password, DUMMY_HASH)
}
