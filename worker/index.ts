/// <reference types="@cloudflare/workers-types" />
// ---------- Types ----------
interface Env {
  LIVEBLOCKS_SECRET_KEY: string;
  JWT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  DB: D1Database;
  ASSETS: { fetch: typeof fetch };
}

interface D1Result<T = Record<string, unknown>> {
  results?: T[];
  success: boolean;
  meta?: unknown;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
}
interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(col?: string): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
}

type Row = Record<string, unknown>;

// ---------- Small helpers ----------
const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...(corsHeaders() as Record<string, string>),
    },
  });

const err = (message: string, status: number): Response =>
  json({ error: message }, status);

const REFRESH_COOKIE_NAME = "vh_refresh";
const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const ACCESS_TTL_SECONDS = 60 * 15; // 15 minutes

function corsHeaders(): HeadersInit {
  // Dev convenience: allow the Vite dev server origin
  return {};
}

function getCookies(request: Request): Record<string, string> {
  const out: Record<string, string> = {};
  const raw = request.headers.get("Cookie") ?? "";
  for (const part of raw.split(";")) {
    const idx = part.indexOf("=");
    if (idx > -1) out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

function refreshCookie(request: Request, token: string, maxAge: number): string {
  const hostname = new URL(request.url).hostname;
  const isLocalDev = hostname === "localhost" || hostname === "127.0.0.1";
  const parts = [
    `${REFRESH_COOKIE_NAME}=${token}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${maxAge}`,
  ];
  if (!isLocalDev) parts.push("Secure");
  return parts.join("; ");
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function bytesToB64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function b64ToBytes(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

// ---------- Password hashing (PBKDF2-SHA256, no dependencies) ----------
const PBKDF2_ITERATIONS = 100_000;

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return `pbkdf2:${PBKDF2_ITERATIONS}:${bytesToB64(salt)}:${bytesToB64(new Uint8Array(bits))}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iterStr, saltB64, hashB64] = stored.split(":");
  if (scheme !== "pbkdf2") return false;
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: b64ToBytes(saltB64), iterations: Number(iterStr), hash: "SHA-256" },
    keyMaterial,
    256
  );
  const a = new Uint8Array(bits);
  const b = b64ToBytes(hashB64);
  if (a.length !== b.length) return false;
  let diff = 0; // constant-time compare
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

// ---------- JWT (HMAC-SHA256, no dependencies) ----------
function b64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function b64urlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

async function signJWT(payload: Record<string, unknown>, secret: string, ttlSeconds: number): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify({ ...payload, iat: now, exp: now + ttlSeconds }));
  const data = `${header}.${body}`;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return `${data}.${b64url(sig)}`;
}

async function verifyJWT(token: string, secret: string): Promise<{ sub: string } | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
  );
  const valid = await crypto.subtle.verify(
    "HMAC", key, b64urlDecode(sig), new TextEncoder().encode(`${header}.${body}`)
  );
  if (!valid) return null;
  const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(body)));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

// ---------- Sessions ----------
async function createRefreshToken(db: D1Database, userId: string): Promise<string> {
  const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
  const token = bytesToB64(tokenBytes);
  const id = await sha256Hex(token);
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare("INSERT INTO refresh_tokens (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
    .bind(id, userId, now + REFRESH_TTL_SECONDS, now)
    .run();
  return token;
}

async function getUserIdFromRefreshToken(db: D1Database, token: string): Promise<string | null> {
  const id = await sha256Hex(token);
  const now = Math.floor(Date.now() / 1000);
  const row = await db
    .prepare("SELECT user_id FROM refresh_tokens WHERE id = ? AND expires_at > ?")
    .bind(id, now)
    .first<{ user_id: string }>();
  return row?.user_id ?? null;
}

async function revokeRefreshToken(db: D1Database, token: string): Promise<void> {
  const id = await sha256Hex(token);
  await db.prepare("DELETE FROM refresh_tokens WHERE id = ?").bind(id).run();
}

// Verifies the short-lived access token sent as "Authorization: Bearer <jwt>".
// No database hit needed — the signature alone proves it's valid.
async function getUserFromRequest(
  db: D1Database,
  request: Request,
  jwtSecret: string
): Promise<{ id: string; email: string; name: string } | null> {
  const authHeader = request.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;

  const payload = await verifyJWT(token, jwtSecret);
  if (!payload?.sub) return null;

  const user = await db
    .prepare("SELECT id, email, name FROM users WHERE id = ?")
    .bind(payload.sub)
    .first<{ id: string; email: string; name: string }>();
  return user ?? null;
}

// Ownership helpers -------------------------------------------------------
async function ownsVault(db: D1Database, vaultId: string, userId: string): Promise<boolean> {
  const row = await db
    .prepare("SELECT id FROM vaults WHERE id = ? AND user_id = ?")
    .bind(vaultId, userId)
    .first();
  return !!row;
}

async function getPageWithVault(
  db: D1Database,
  pageId: string,
  userId: string
): Promise<Row | null> {
  return db
    .prepare(
      `SELECT p.*, v.user_id FROM pages p JOIN vaults v ON v.id = p.vault_id
       WHERE p.id = ? AND v.user_id = ?`
    )
    .bind(pageId, userId)
    .first();
}

// Recursive subtree of a page (the page itself + all descendants)
const SUBTREE_SQL = `
  WITH RECURSIVE sub(id) AS (
    SELECT id FROM pages WHERE id = ?1
    UNION ALL
    SELECT p.id FROM pages p JOIN sub ON p.parent_id = sub.id
  )`;

// ---------- Row mapping: snake_case DB -> camelCase client shape ----------
function mapPage(r: Row): Row {
  return {
    id: r.id,
    vaultId: r.vault_id,
    parentId: r.parent_id,
    title: r.title,
    content: r.content,
    icon: r.icon,
    cover: r.cover,
    favorite: !!r.favorite,
    trashed: !!r.trashed,
    isExpanded: !!r.is_expanded,
    orderIndex: r.order_index,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapVault(r: Row): Row {
  return { id: r.id, name: r.name, createdAt: r.created_at };
}

// ---------- Main fetch handler ----------
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight (only relevant when Vite dev server calls :8787 directly)
    if (request.method === "OPTIONS") return new Response(null, { status: 204 });

    try {
      // ----- Auth -----
      if (path === "/api/auth/signup") return await signup(request, env.DB, env.JWT_SECRET);
      if (path === "/api/auth/login") return await login(request, env.DB, env.JWT_SECRET);
      if (path === "/api/auth/refresh") return await refresh(request, env.DB, env.JWT_SECRET);
      if (path === "/api/auth/logout") return await logout(request, env.DB);
      if (path === "/api/auth/me") return await me(request, env.DB, env.JWT_SECRET);
      if (path === "/api/auth/google") return await googleLogin(request, env);
      if (path === "/api/auth/google/callback") return await googleCallback(request, env, env.DB);

      // ----- Everything below requires a valid access token -----
      const user = await getUserFromRequest(env.DB, request, env.JWT_SECRET);
      if (!user && path.startsWith("/api/")) return err("Not signed in", 401);

      if (path === "/api/vaults" && request.method === "GET")
        return listVaults(env.DB, user!.id);
      if (path === "/api/vaults" && request.method === "POST")
        return createVault(request, env.DB, user!.id);

      let m = path.match(/^\/api\/vaults\/([^/]+)$/);
      if (m && request.method === "PATCH") return renameVault(request, env.DB, user!.id, m[1]);
      if (m && request.method === "DELETE") return deleteVault(env.DB, user!.id, m[1]);

      m = path.match(/^\/api\/vaults\/([^/]+)\/pages$/);
      if (m && request.method === "GET") return listPages(env.DB, user!.id, m[1]);

      if (path === "/api/pages" && request.method === "POST")
        return createPage(request, env.DB, user!.id);

      if (path === "/api/pages/reorder" && request.method === "POST")
        return reorderPage(request, env.DB, user!.id);

      m = path.match(/^\/api\/pages\/([^/]+)\/duplicate$/);
      if (m && request.method === "POST") return duplicatePage(request, env.DB, user!.id, m[1]);

      m = path.match(/^\/api\/pages\/([^/]+)\/restore$/);
      if (m && request.method === "POST") return restorePage(env.DB, user!.id, m[1]);

      m = path.match(/^\/api\/pages\/([^/]+)$/);
      if (m && request.method === "PATCH") return patchPage(request, env.DB, user!.id, m[1]);
      if (m && request.method === "DELETE")
        return deletePage(env.DB, user!.id, m[1], url.searchParams.get("permanent") === "true");
      // ----- Liveblocks auth (unchanged behaviour) -----
      if (path === "/api/liveblocks-auth" && request.method === "POST")
        return handleLiveblocksAuth(request, env);

      // ----- Static site -----
      return env.ASSETS.fetch(request);
    } catch (e) {
      console.error(e);
      return err("Internal server error", 500);
    }
  },
};

// ---------- Google OAuth ----------
function googleRedirectUri(request: Request): string {
  return `http://127.0.0.1:8787/api/auth/google/callback`;
}

async function googleLogin(request: Request, env: Env): Promise<Response> {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: googleRedirectUri(request),
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
  });
  return Response.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    302
  );
}

async function googleCallback(request: Request, env: Env, db: D1Database): Promise<Response> {
  const code = new URL(request.url).searchParams.get("code");
  if (!code) return err("Missing authorization code", 400);

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: googleRedirectUri(request),
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) return err("Google sign-in failed", 401);
  const tokens = (await tokenRes.json()) as { access_token: string };

  const profileRes = await fetch(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    { headers: { Authorization: `Bearer ${tokens.access_token}` } }
  );
  if (!profileRes.ok) return err("Google sign-in failed", 401);

  const profile = (await profileRes.json()) as {
    sub: string; email: string; name?: string; picture?: string;
  };

  // Link to an existing account by google_sub, or by matching email
  // (so someone who signed up with a password can also use Google later).
  const user = await db
    .prepare("SELECT id FROM users WHERE google_sub = ? OR email = ?")
    .bind(profile.sub, profile.email.toLowerCase())
    .first<{ id: string }>();

  let userId: string;
  if (user) {
    userId = user.id;
    await db
      .prepare("UPDATE users SET google_sub = ?, avatar = ? WHERE id = ?")
      .bind(profile.sub, profile.picture ?? "", userId)
      .run();
  } else {
    userId = crypto.randomUUID();
    await db
      .prepare(
        "INSERT INTO users (id, email, password_hash, name, google_sub, avatar) VALUES (?, ?, '', ?, ?, ?)"
      )
      .bind(userId, profile.email.toLowerCase(), profile.name ?? "", profile.sub, profile.picture ?? "")
      .run();
  }

  const refreshToken = await createRefreshToken(db, userId);
  const origin = new URL(request.url).origin;

  return new Response(null, {
    status: 302,
    headers: {
      Location: origin,
      "Set-Cookie": refreshCookie(request, refreshToken, REFRESH_TTL_SECONDS),
    },
  });
}

// ---------- Auth handlers ----------
async function signup(request: Request, db: D1Database, jwtSecret: string): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as {
    email?: string; password?: string; name?: string;
  };
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const name = (body.name ?? "").trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err("Enter a valid email address", 400);
  if (password.length < 8) return err("Password must be at least 8 characters", 400);

  const existing = await db.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  if (existing) return err("An account with this email already exists", 409);

  const id = crypto.randomUUID();
  await db
    .prepare("INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)")
    .bind(id, email, await hashPassword(password), name)
    .run();

  // Housekeeping: drop expired refresh tokens
  await db.prepare("DELETE FROM refresh_tokens WHERE expires_at < unixepoch()").run();

  const refreshToken = await createRefreshToken(db, id);
  const accessToken = await signJWT({ sub: id }, jwtSecret, ACCESS_TTL_SECONDS);

  return new Response(
    JSON.stringify({ user: { id, email, name }, accessToken }),
    {
      status: 201,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": refreshCookie(request, refreshToken, REFRESH_TTL_SECONDS),
      },
    }
  );
}

async function login(request: Request, db: D1Database, jwtSecret: string): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as { email?: string; password?: string };
  const email = (body.email ?? "").trim().toLowerCase();
  const row = await db
    .prepare("SELECT id, email, name, password_hash FROM users WHERE email = ?")
    .bind(email)
    .first<{ id: string; email: string; name: string; password_hash: string }>();

  if (!row || !(await verifyPassword(body.password ?? "", row.password_hash)))
    return err("Invalid email or password", 401);

  const refreshToken = await createRefreshToken(db, row.id);
  const accessToken = await signJWT({ sub: row.id }, jwtSecret, ACCESS_TTL_SECONDS);

  return new Response(
    JSON.stringify({ user: { id: row.id, email: row.email, name: row.name }, accessToken }),
    {
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": refreshCookie(request, refreshToken, REFRESH_TTL_SECONDS),
      },
    }
  );
}

// Called by the frontend whenever the access token has expired, using the
// httpOnly refresh cookie (never touched by JS) to mint a new one. Also
// rotates the refresh token itself — the old one stops working immediately,
// so a stolen/replayed refresh token can only ever be used once.
async function refresh(request: Request, db: D1Database, jwtSecret: string): Promise<Response> {
  const oldToken = getCookies(request)[REFRESH_COOKIE_NAME];
  if (!oldToken) return err("Not signed in", 401);

  const userId = await getUserIdFromRefreshToken(db, oldToken);
  if (!userId) return err("Session expired, please sign in again", 401);

  await revokeRefreshToken(db, oldToken);
  const newRefreshToken = await createRefreshToken(db, userId);
  const accessToken = await signJWT({ sub: userId }, jwtSecret, ACCESS_TTL_SECONDS);

  return new Response(JSON.stringify({ accessToken }), {
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": refreshCookie(request, newRefreshToken, REFRESH_TTL_SECONDS),
    },
  });
}

async function logout(request: Request, db: D1Database): Promise<Response> {
  const token = getCookies(request)[REFRESH_COOKIE_NAME];
  if (token) await revokeRefreshToken(db, token);
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json", "Set-Cookie": refreshCookie(request, "", 0) },
  });
}

async function me(request: Request, db: D1Database, jwtSecret: string): Promise<Response> {
  const user = await getUserFromRequest(db, request, jwtSecret);
  if (!user) return err("Not signed in", 401);
  return json({ user });
}

// ---------- Vault handlers ----------
async function listVaults(db: D1Database, userId: string): Promise<Response> {
  const res = await db
    .prepare("SELECT * FROM vaults WHERE user_id = ? ORDER BY created_at ASC")
    .bind(userId)
    .all<Row>();
  return json({ vaults: res.results?.map(mapVault) ?? [] });
}

async function createVault(request: Request, db: D1Database, userId: string): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as { name?: string; id?: string };
  const name = (body.name ?? "").trim();
  if (!name) return err("Vault name is required", 400);
  const id = body.id || crypto.randomUUID();
  await db.prepare("INSERT INTO vaults (id, user_id, name) VALUES (?, ?, ?)").bind(id, userId, name).run();
  return json({ vault: { id, name, createdAt: Math.floor(Date.now() / 1000) } }, 201);
}

async function renameVault(request: Request, db: D1Database, userId: string, vaultId: string): Promise<Response> {
  if (!(await ownsVault(db, vaultId, userId))) return err("Vault not found", 404);
  const body = (await request.json().catch(() => ({}))) as { name?: string };
  const name = (body.name ?? "").trim();
  if (!name) return err("Name is required", 400);
  await db.prepare("UPDATE vaults SET name = ? WHERE id = ?").bind(name, vaultId).run();
  return json({ ok: true });
}

async function deleteVault(db: D1Database, userId: string, vaultId: string): Promise<Response> {
  if (!(await ownsVault(db, vaultId, userId))) return err("Vault not found", 404);
  await db.prepare("DELETE FROM pages WHERE vault_id = ?").bind(vaultId).run(); // explicit (cascade also covers it)
  await db.prepare("DELETE FROM vaults WHERE id = ?").bind(vaultId).run();
  return json({ ok: true });
}

// ---------- Page handlers ----------
async function listPages(db: D1Database, userId: string, vaultId: string): Promise<Response> {
  if (!(await ownsVault(db, vaultId, userId))) return err("Vault not found", 404);
  const res = await db
    .prepare("SELECT * FROM pages WHERE vault_id = ? ORDER BY order_index ASC, created_at ASC")
    .bind(vaultId)
    .all<Row>();
  return json({ pages: res.results?.map(mapPage) ?? [] });
}

async function createPage(request: Request, db: D1Database, userId: string): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as {
    id?: string; vaultId?: string; parentId?: string | null; title?: string; icon?: string;
  };
  const vaultId = body.vaultId ?? "";
  if (!(await ownsVault(db, vaultId, userId))) return err("Vault not found", 404);
  if (body.parentId && !(await getPageWithVault(db, body.parentId, userId)))
    return err("Parent page not found", 404);

  const id = body.id || crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const maxRow = await db
    .prepare("SELECT MAX(order_index) AS m FROM pages WHERE vault_id = ? AND parent_id IS ?")
    .bind(vaultId, body.parentId ?? null)
    .first<{ m: number | null }>();
  const orderIndex = (maxRow?.m ?? 0) + 1;

  await db
    .prepare(
      `INSERT INTO pages (id, vault_id, parent_id, title, content, icon, cover, favorite, trashed, is_expanded, order_index, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id, vaultId, body.parentId ?? null,
      (body as Record<string, unknown>).title as string || "Untitled",
      (body as Record<string, unknown>).content as string || "",
      (body as Record<string, unknown>).icon as string || "📄",
      (body as Record<string, unknown>).cover as string || "",
      (body as Record<string, unknown>).favorite ? 1 : 0,
      (body as Record<string, unknown>).trashed ? 1 : 0,
      (body as Record<string, unknown>).isExpanded === false ? 0 : 1,
      orderIndex, now, now
    )
    .run();

  return json({ page: mapPage({
    id, vault_id: vaultId, parent_id: body.parentId ?? null,
    title: body.title || "Untitled", content: "", icon: body.icon || "📄",
    cover: "", favorite: 0, trashed: 0, is_expanded: 1,
    order_index: orderIndex, created_at: now, updated_at: now,
  }) }, 201);
}

async function patchPage(request: Request, db: D1Database, userId: string, pageId: string): Promise<Response> {
  const page = await getPageWithVault(db, pageId, userId);
  if (!page) return err("Page not found", 404);

  const body = (await request.json().catch(() => ({}))) as Row;
  const allowed: Record<string, (v: unknown) => unknown> = {
    title: (v) => String(v),
    content: (v) => String(v),
    icon: (v) => String(v),
    cover: (v) => String(v),
    favorite: (v) => (v ? 1 : 0),
    trashed: (v) => (v ? 1 : 0),
    isExpanded: (v) => (v ? 1 : 0),
    parentId: (v) => (v === null ? null : String(v)),
    orderIndex: (v) => Number(v),
  };

  const sets: string[] = [];
  const values: unknown[] = [];
  for (const [key, transform] of Object.entries(allowed)) {
    if (key in body) {
      sets.push(`${{ favorite: "favorite", trashed: "trashed", isExpanded: "is_expanded", parentId: "parent_id", orderIndex: "order_index" }[key] ?? key} = ?`);
      values.push(transform(body[key]));
    }
  }
  if (sets.length === 0) return json({ page: mapPage(page) });

  sets.push("updated_at = ?");
  values.push(Math.floor(Date.now() / 1000));
  values.push(pageId);
  await db.prepare(`UPDATE pages SET ${sets.join(", ")} WHERE id = ?`).bind(...values).run();

  const updated = await getPageWithVault(db, pageId, userId);
  return json({ page: updated ? mapPage(updated) : null });
}

async function duplicatePage(request: Request, db: D1Database, userId: string, pageId: string): Promise<Response> {
  const page = await getPageWithVault(db, pageId, userId);
  if (!page) return err("Page not found", 404);
  const body = (await request.json().catch(() => ({}))) as { newId?: string };
  const newId = body.newId || crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  await db
    .prepare(
      `INSERT INTO pages (id, vault_id, parent_id, title, content, icon, cover, favorite, trashed, is_expanded, order_index, created_at, updated_at)
       SELECT ?, vault_id, parent_id, title || ' Copy', content, icon, cover, 0, 0, is_expanded,
              (SELECT COALESCE(MAX(p2.order_index),0)+1 FROM pages p2 WHERE p2.vault_id = pages.vault_id AND p2.parent_id IS pages.parent_id),
              ?, ?
       FROM pages WHERE id = ?`
    )
    .bind(newId, now, now, pageId)
    .run();

  const created = await getPageWithVault(db, newId, userId);
  return json({ page: created ? mapPage(created) : null }, 201);
}

async function restorePage(db: D1Database, userId: string, pageId: string): Promise<Response> {
  const page = await getPageWithVault(db, pageId, userId);
  if (!page) return err("Page not found", 404);
  await db
    .prepare(`${SUBTREE_SQL} UPDATE pages SET trashed = 0, updated_at = unixepoch() WHERE id IN (SELECT id FROM sub)`)
    .bind(pageId)
    .run();
  return json({ ok: true });
}

async function deletePage(db: D1Database, userId: string, pageId: string, permanent: boolean): Promise<Response> {
  const page = await getPageWithVault(db, pageId, userId);
  if (!page) return err("Page not found", 404);

  if (permanent) {
    await db
      .prepare(`DELETE FROM pages WHERE id IN (${SUBTREE_SQL.replace("?1", "?")} SELECT id FROM sub)`.replace("DELETE FROM pages WHERE id IN (", "DELETE FROM pages WHERE id IN ("))
      .bind(pageId)
      .run();
  } else {
    await db
      .prepare(`${SUBTREE_SQL} UPDATE pages SET trashed = 1, updated_at = unixepoch() WHERE id IN (SELECT id FROM sub)`)
      .bind(pageId)
      .run();
  }
  return json({ ok: true });
}

async function reorderPage(request: Request, db: D1Database, userId: string): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as {
    draggedId?: string; targetId?: string; position?: "before" | "after";
  };
  const { draggedId, targetId, position } = body;
  if (!draggedId || !targetId || !position) return err("draggedId, targetId and position are required", 400);

  const dragged = await getPageWithVault(db, draggedId, userId);
  const target = await getPageWithVault(db, targetId, userId);
  if (!dragged || !target) return err("Page not found", 404);

  // Prevent dropping a page into its own subtree
  const subtree = await db
    .prepare(`${SUBTREE_SQL} SELECT id FROM sub`)
    .bind(draggedId)
    .all<Row>();
  if ((subtree.results ?? []).some((r) => r.id === targetId)) return err("Cannot move a page into itself", 400);

  const siblings = await db
    .prepare(
      `SELECT id, order_index FROM pages
       WHERE vault_id = ? AND parent_id IS ? AND id != ?
       ORDER BY order_index ASC`
    )
    .bind(target.vault_id, target.parent_id, draggedId)
    .all<{ id: string; order_index: number }>();

  const tIdx = (siblings.results ?? []).findIndex((r) => r.id === targetId);
  const prev = position === "before" ? (siblings.results ?? [])[tIdx - 1] : (siblings.results ?? [])[tIdx];
  const next = position === "before" ? (siblings.results ?? [])[tIdx] : (siblings.results ?? [])[tIdx + 1];

  let newOrder: number;
  if (prev && next) newOrder = ((prev.order_index as number) + (next.order_index as number)) / 2;
  else if (next) newOrder = (next.order_index as number) - 1;
  else if (prev) newOrder = (prev.order_index as number) + 1;
  else newOrder = 1;

  await db
    .prepare("UPDATE pages SET parent_id = ?, order_index = ?, updated_at = unixepoch() WHERE id = ?")
    .bind(target.parent_id, newOrder, draggedId)
    .run();
  return json({ ok: true });
}

// ---------- Liveblocks auth (unchanged) ----------
async function handleLiveblocksAuth(request: Request, env: Env): Promise<Response> {
  let body: { userId?: string; userName?: string } = {};
  try {
    body = await request.json();
  } catch {
    // no body sent, that's fine, we'll use defaults
  }

  const userId = body.userId || crypto.randomUUID();
  const userName = body.userName || "Anonymous";

  const response = await fetch("https://api.liveblocks.io/v2/authorize-user", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.LIVEBLOCKS_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId,
      userInfo: { name: userName },
      permissions: { "*": ["room:write"] },
    }),
  });

  const result = await response.text();
  return new Response(result, {
    status: response.status,
    headers: { "Content-Type": "application/json" },
  });
}
