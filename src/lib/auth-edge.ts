export const SESSION_COOKIE_NAME = 'ashirwad_session';
export const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  'ashirwad-technologies-secret-encryption-key-2026-vyaapar-production-secure';

export interface TokenPayload {
  userId: string;
  username: string;
  role: string;
  exp: number;
}

/**
 * Pure Web Crypto HMAC-SHA256 verification compatible with Edge Runtime
 */
export async function verifySessionTokenEdge(token: string): Promise<TokenPayload | null> {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(SESSION_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(`${header}.${payload}`));
    const bytes = new Uint8Array(sigBuf);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const computedSignature = btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    if (computedSignature !== signature) return null;

    // Decode base64url payload
    const binPayload = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const data: TokenPayload = JSON.parse(binPayload);
    const now = Math.floor(Date.now() / 1000);
    if (data.exp && data.exp < now) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}
