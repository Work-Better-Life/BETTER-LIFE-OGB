import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./db";

const SESSION_COOKIE = "session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET must be set in the environment.");
  }
  return new TextEncoder().encode(secret);
}

type SessionPayload = {
  sub: string;
  v: number;
};

export async function createSessionCookie(userId: string, sessionVersion: number) {
  const token = await new SignJWT({ v: sessionVersion } satisfies Omit<SessionPayload, "sub">)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function readSessionToken(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.sub !== "string" || typeof payload.v !== "number") return null;
    return { userId: payload.sub, sessionVersion: payload.v };
  } catch {
    return null;
  }
}

async function sessionFromToken(token: string | undefined) {
  const parsed = await readSessionToken(token);
  if (!parsed) return null;

  const user = await prisma.user.findUnique({ where: { id: parsed.userId } });
  if (!user || user.sessionVersion !== parsed.sessionVersion) return null;

  const role = normalizeRole(user.role);
  return { id: user.id, email: user.email, name: user.name, role, canWrite: role === "admin" };
}

export async function getSession() {
  const cookieStore = await cookies();
  return sessionFromToken(cookieStore.get(SESSION_COOKIE)?.value);
}

// Same check, reading the cookie straight off an incoming request. Used where a
// third-party handler (UploadThing's route) runs our code and Next's cookies()
// helper can't be relied on.
export async function getSessionFromRequest(request: Request) {
  const header = request.headers.get("cookie") ?? "";
  const pair = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  const token = pair ? decodeURIComponent(pair.slice(SESSION_COOKIE.length + 1)) : undefined;
  return sessionFromToken(token);
}

export type Role = "admin" | "viewer";

// Accounts created before roles existed have no role and are admins. Anything
// unrecognised is treated as view-only, so a typo can never grant write access.
export function normalizeRole(role: string | null | undefined): Role {
  return role === null || role === undefined || role === "admin" ? "admin" : "viewer";
}

export const VIEW_ONLY_MESSAGE = "This is a view-only account — it can't make changes.";

// For pages and actions that need a signed-in user but only read data.
export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

// For pages that only make sense when the user can edit (record a test,
// import, edit profile). View-only users are sent back to the dashboard.
export async function requireWriterPage() {
  const session = await requireSession();
  if (!session.canWrite) redirect("/dashboard");
  return session;
}

// Gate for every server action that changes data. Server actions are public
// POST endpoints, so hiding buttons is not enough — this is the real check.
// Returns an error message for view-only users; callers return it as their
// form error, or throw it when they have no error state to return.
export async function guardWrite(): Promise<string | null> {
  const session = await requireSession();
  return session.canWrite ? null : VIEW_ONLY_MESSAGE;
}

export async function requireWriter() {
  const denied = await guardWrite();
  if (denied) throw new Error(denied);
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
