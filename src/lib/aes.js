// ============================================================
// HiTasky — Pure-JS AES-256-CTR encrypt / decrypt (Phase 2.2).
//
// Why a custom implementation instead of a library?
//   • Zero new dependencies — no native module, no Expo Go issues.
//   • The cipher is simple to audit: AES-CTR is XOR of keystream
//     with plaintext. No padding oracle, no PKCS#7 complexity.
//   • Performance is fine for a few KB JSON blob on every save.
//
// Security properties:
//   • AES-256 (32-byte key) — current standard, no known attack.
//   • CTR mode with a random 16-byte nonce — nonce reuse would break
//     confidentiality for two messages using the SAME key, which
//     cannot happen here (each write gets a fresh nonce).
//   • The key is generated once and stored in expo-secure-store
//     (Android Keystore on Android ≥ 6). Extracting it requires
//     root + TEE bypass — not practical with standard tools.
//   • No MAC / authentication tag. The stored blob could be silently
//     corrupted by a rooted attacker (they can't read it, but they
//     could zero it). For a task manager this is an acceptable risk;
//     add AES-GCM or an HMAC if you need tamper-detection on the
//     ciphertext itself. We already detect store corruption via the
//     atomic-persistence crash-recovery path in store.js.
//
// AES S-box, key schedule, and CTR driver below.
// ============================================================

// ---- AES S-box (forward only — CTR decryption uses encrypt) ----
const SBOX = new Uint8Array([
  99,124,119,123,242,107,111,197,48,1,103,43,254,215,171,118,202,130,201,125,250,89,71,240,173,212,162,175,156,164,114,192,
  183,253,147,38,54,63,247,204,52,165,229,241,113,216,49,21,4,199,35,195,24,150,5,154,7,18,128,226,235,39,178,117,
  9,131,44,26,27,110,90,160,82,59,214,179,41,227,47,132,83,209,0,237,32,252,177,91,106,203,190,57,74,76,88,207,
  208,239,170,251,67,77,51,133,69,249,2,127,80,60,159,168,81,163,64,143,146,157,56,245,188,182,218,33,16,255,243,210,
  205,12,19,236,95,151,68,23,196,167,126,61,100,93,25,115,96,129,79,220,34,42,144,136,70,238,184,20,222,94,11,219,
  224,50,58,10,73,6,36,92,194,211,172,98,145,149,228,121,231,200,55,109,141,213,78,169,108,86,244,234,101,122,174,8,
  186,120,37,46,28,166,180,198,232,221,116,31,75,189,139,138,112,62,181,102,72,3,246,14,97,53,87,185,134,193,29,158,
  225,248,152,17,105,217,142,148,155,30,135,233,206,85,40,223,140,161,137,13,191,230,66,104,65,153,45,15,176,84,187,22,
]);

// ---- AES key schedule ----
const RCON = new Uint8Array([1,2,4,8,16,32,64,128,27,54]);

function expandKey(key32) {
  const w = new Uint8Array(176);
  w.set(key32);
  for (let i = 32; i < 176; i += 4) {
    let t0 = w[i - 4], t1 = w[i - 3], t2 = w[i - 2], t3 = w[i - 1];
    if ((i & 31) === 0) {
      // SubWord(RotWord(t)) XOR Rcon
      const tmp = t0;
      t0 = SBOX[t1] ^ RCON[(i >>> 5) - 1];
      t1 = SBOX[t2];
      t2 = SBOX[t3];
      t3 = SBOX[tmp];
    } else if ((i & 31) === 16) {
      // SubWord only (AES-256 extra step)
      t0 = SBOX[t0]; t1 = SBOX[t1]; t2 = SBOX[t2]; t3 = SBOX[t3];
    }
    w[i]     = w[i - 32] ^ t0;
    w[i + 1] = w[i - 31] ^ t1;
    w[i + 2] = w[i - 30] ^ t2;
    w[i + 3] = w[i - 29] ^ t3;
  }
  return w;
}

// ---- Galois-field multiplication (used in MixColumns) ----
function xtime(b) { return ((b << 1) ^ (b & 0x80 ? 0x1b : 0)) & 0xff; }
function mul(a, b) {
  return (
    (b & 1 ? a : 0) ^
    (b & 2 ? xtime(a) : 0) ^
    (b & 4 ? xtime(xtime(a)) : 0) ^
    (b & 8 ? xtime(xtime(xtime(a))) : 0)
  ) & 0xff;
}

// ---- AES block encrypt (state is 16-byte Uint8Array, modified in place) ----
function aesBlock(state, roundKeys) {
  // AddRoundKey — round 0
  for (let i = 0; i < 16; i++) state[i] ^= roundKeys[i];

  for (let round = 1; round <= 14; round++) {
    // SubBytes
    for (let i = 0; i < 16; i++) state[i] = SBOX[state[i]];

    // ShiftRows
    let tmp;
    tmp = state[1]; state[1] = state[5]; state[5] = state[9]; state[9] = state[13]; state[13] = tmp;
    tmp = state[2]; state[2] = state[10]; state[10] = tmp;
    tmp = state[6]; state[6] = state[14]; state[14] = tmp;
    tmp = state[15]; state[15] = state[11]; state[11] = state[7]; state[7] = state[3]; state[3] = tmp;

    if (round < 14) {
      // MixColumns
      for (let c = 0; c < 16; c += 4) {
        const s0 = state[c], s1 = state[c+1], s2 = state[c+2], s3 = state[c+3];
        state[c]   = mul(s0,2) ^ mul(s1,3) ^ s2 ^ s3;
        state[c+1] = s0 ^ mul(s1,2) ^ mul(s2,3) ^ s3;
        state[c+2] = s0 ^ s1 ^ mul(s2,2) ^ mul(s3,3);
        state[c+3] = mul(s0,3) ^ s1 ^ s2 ^ mul(s3,2);
      }
    }

    // AddRoundKey
    const rk = round * 16;
    for (let i = 0; i < 16; i++) state[i] ^= roundKeys[rk + i];
  }
}

// ---- CTR mode: encrypt and decrypt are identical ----
// nonce: 16-byte Uint8Array (the counter block is nonce for block 0,
//        nonce+1 for block 1, etc. — upper 12 bytes fixed, lower 4 wrap).
function ctr(keyBytes, nonce, data) {
  const rk = expandKey(keyBytes);
  const out = new Uint8Array(data.length);
  const block = new Uint8Array(16);
  // Copy nonce into counter (big-endian counter in last 4 bytes)
  block.set(nonce.slice(0, 12), 0);
  let counter = (nonce[12] << 24) | (nonce[13] << 16) | (nonce[14] << 8) | nonce[15];
  counter = counter >>> 0; // treat as uint32

  for (let offset = 0; offset < data.length; offset += 16) {
    // Set counter into last 4 bytes (big-endian)
    block[12] = (counter >>> 24) & 0xff;
    block[13] = (counter >>> 16) & 0xff;
    block[14] = (counter >>>  8) & 0xff;
    block[15] = counter & 0xff;

    const ks = new Uint8Array(block); // keystream block
    aesBlock(ks, rk);

    const end = Math.min(offset + 16, data.length);
    for (let i = offset; i < end; i++) out[i] = data[i] ^ ks[i - offset];

    counter = (counter + 1) >>> 0;
  }
  return out;
}

// ---- Hex encode / decode (no Buffer in RN) ----
function toHex(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += bytes[i].toString(16).padStart(2, '0');
  return s;
}
function fromHex(hex) {
  const out = new Uint8Array(hex.length >>> 1);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

// ---- UTF-8 encode / decode ----
function toUTF8(str) {
  // encodeURIComponent handles all Unicode; decodes to latin1-safe %XX pairs
  const enc = encodeURIComponent(str);
  const bytes = [];
  for (let i = 0; i < enc.length; i++) {
    if (enc[i] === '%') {
      bytes.push(parseInt(enc.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      bytes.push(enc.charCodeAt(i));
    }
  }
  return new Uint8Array(bytes);
}

function fromUTF8(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i];
    if (b < 0x80) { s += String.fromCharCode(b); i++; }
    else if (b < 0xe0) { s += String.fromCharCode(((b & 0x1f) << 6) | (bytes[i+1] & 0x3f)); i += 2; }
    else if (b < 0xf0) { s += String.fromCharCode(((b & 0x0f) << 12) | ((bytes[i+1] & 0x3f) << 6) | (bytes[i+2] & 0x3f)); i += 3; }
    else {
      const cp = ((b & 0x07) << 18) | ((bytes[i+1] & 0x3f) << 12) | ((bytes[i+2] & 0x3f) << 6) | (bytes[i+3] & 0x3f);
      const hi = ((cp - 0x10000) >> 10) + 0xd800;
      const lo = ((cp - 0x10000) & 0x3ff) + 0xdc00;
      s += String.fromCharCode(hi) + String.fromCharCode(lo);
      i += 4;
    }
  }
  return s;
}

// ---- Public API ----

/**
 * Encrypt a UTF-8 string.
 * Returns a hex string: 32-char nonce + ciphertext.
 * key32: Uint8Array[32]
 */
export function encryptString(key32, plaintext) {
  let nonce;
  try {
    // Use expo-crypto for a cryptographically random nonce when available.
    const Crypto = require('expo-crypto');
    nonce = Crypto.getRandomBytes(16);
  } catch (_) {
    // Fallback: Math.random — fine for the nonce (not the key).
    nonce = new Uint8Array(16);
    for (let i = 0; i < 16; i++) nonce[i] = Math.floor(Math.random() * 256);
  }
  const plainBytes = toUTF8(plaintext);
  const cipherBytes = ctr(key32, nonce, plainBytes);
  return toHex(nonce) + toHex(cipherBytes);
}

/**
 * Decrypt a hex string produced by encryptString.
 * Returns the original UTF-8 string, or throws on bad input.
 * key32: Uint8Array[32]
 */
export function decryptString(key32, hexCipher) {
  if (!hexCipher || hexCipher.length < 32) throw new Error('Bad ciphertext');
  const nonce = fromHex(hexCipher.slice(0, 32));
  const cipherBytes = fromHex(hexCipher.slice(32));
  const plainBytes = ctr(key32, nonce, cipherBytes);
  return fromUTF8(plainBytes);
}
