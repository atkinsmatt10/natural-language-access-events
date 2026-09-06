/** Constant-length digest comparison, also available in the middleware runtime. */
export async function validCredentials(header: string | null, username: string | undefined, password: string | undefined) {
  if (!username || !password || password.length < 32 || !header || header.length > 2_048) return false;
  const match = /^Basic ([A-Za-z0-9+/]+={0,2})$/i.exec(header);
  if (!match) return false;
  let supplied: string;
  try { supplied = atob(match[1]); } catch { return false; }
  const encoder = new TextEncoder();
  const [actual, expected] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(supplied)),
    crypto.subtle.digest("SHA-256", encoder.encode(`${username}:${password}`)),
  ]);
  const a = new Uint8Array(actual), b = new Uint8Array(expected);
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}
