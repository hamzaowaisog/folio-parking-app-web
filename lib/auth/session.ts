export const ACCESS_TOKEN_COOKIE = "folio3_access_token";
// the signed-in person's role, so the frame shows only the pages that role can open
const SESSION_ROLE = "folio3_session_role";

function readCookie(): string | null {
  if (typeof document === "undefined") return null;
  const cookie = document.cookie.split(";").map((entry) => entry.trim()).find((entry) => entry.startsWith(`${ACCESS_TOKEN_COOKIE}=`));
  if (!cookie) return null;
  try {
    return decodeURIComponent(cookie.slice(ACCESS_TOKEN_COOKIE.length + 1));
  } catch {
    return null;
  }
}

export function getAccessToken(): string | null {
  if (typeof window !== "undefined") {
    try {
      const token = window.localStorage.getItem(ACCESS_TOKEN_COOKIE);
      if (token) return token;
    } catch {
      // The cookie remains available when browser storage is disabled.
    }
  }
  return readCookie();
}

export function getSessionRole(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(SESSION_ROLE);
  } catch {
    return null;
  }
}

export function storeAccessToken(token: string, expiresIn = 3600, role?: string): void {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(ACCESS_TOKEN_COOKIE, token);
      if (role) window.localStorage.setItem(SESSION_ROLE, role);
    } catch {
      // Keep the session usable through the middleware cookie when storage is disabled.
    }

    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${ACCESS_TOKEN_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${Math.max(0, Math.floor(expiresIn))}; SameSite=Lax${secure}`;
  }
}

export function clearAccessToken(): void {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(ACCESS_TOKEN_COOKIE);
      window.localStorage.removeItem(SESSION_ROLE);
    } catch {
      // Clearing the cookie still removes the middleware session.
    }
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${ACCESS_TOKEN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
  }
}
