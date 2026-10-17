import crypto from 'node:crypto'

const KEY_LENGTH = 64
const SALT_BYTES = 16

/**
 * Synchronously hashes a plaintext password using native Node.js crypto.scrypt
 * with a cryptographically secure random salt.
 * 
 * Format: scrypt:<saltHex>:<derivedKeyHex>
 */
export function hashPasswordSync(password: string): string {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string')
  }
  const salt = crypto.randomBytes(SALT_BYTES).toString('hex')
  const derivedKey = crypto.scryptSync(password, salt, KEY_LENGTH)
  return `scrypt:${salt}:${derivedKey.toString('hex')}`
}

/**
 * Asynchronously hashes a plaintext password using native Node.js crypto.scrypt
 */
export function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!password || typeof password !== 'string') {
      return reject(new Error('Password must be a non-empty string'))
    }
    const salt = crypto.randomBytes(SALT_BYTES).toString('hex')
    crypto.scrypt(password, salt, KEY_LENGTH, (err, derivedKey) => {
      if (err) return reject(err)
      resolve(`scrypt:${salt}:${derivedKey.toString('hex')}`)
    })
  })
}

/**
 * Synchronously verifies a plaintext password against a stored scrypt hash
 * using constant-time comparison (crypto.timingSafeEqual).
 */
export function verifyPasswordSync(password: string, combinedHash: string): boolean {
  if (!password || !combinedHash || typeof password !== 'string' || typeof combinedHash !== 'string') {
    return false
  }

  const parts = combinedHash.split(':')
  if (parts.length !== 3) return false

  const [algo, salt, storedHashHex] = parts
  if (algo !== 'scrypt' || !salt || !storedHashHex) return false

  try {
    const derivedKey = crypto.scryptSync(password, salt, KEY_LENGTH)
    const storedKeyBuffer = Buffer.from(storedHashHex, 'hex')
    if (derivedKey.length !== storedKeyBuffer.length) {
      return false
    }
    return crypto.timingSafeEqual(derivedKey, storedKeyBuffer)
  } catch {
    return false
  }
}

/**
 * Asynchronously verifies a plaintext password against a stored scrypt hash
 */
export function verifyPassword(password: string, combinedHash: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!password || !combinedHash || typeof password !== 'string' || typeof combinedHash !== 'string') {
      return resolve(false)
    }

    const parts = combinedHash.split(':')
    if (parts.length !== 3) return resolve(false)

    const [algo, salt, storedHashHex] = parts
    if (algo !== 'scrypt' || !salt || !storedHashHex) return resolve(false)

    crypto.scrypt(password, salt, KEY_LENGTH, (err, derivedKey) => {
      if (err) return resolve(false)
      try {
        const storedKeyBuffer = Buffer.from(storedHashHex, 'hex')
        if (derivedKey.length !== storedKeyBuffer.length) {
          return resolve(false)
        }
        resolve(crypto.timingSafeEqual(derivedKey, storedKeyBuffer))
      } catch {
        resolve(false)
      }
    })
  })
}
