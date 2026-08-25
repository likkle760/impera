export const API = process.env.NEXT_PUBLIC_API_URL || "https://impera-5b6l.onrender.com";

const TOKEN_KEY = "impera_token";

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setToken(t: string | null) {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch {}
}

async function req(path: string, opts: RequestInit = {}) {
  const res = await fetch(API + path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(getToken() ? { Authorization: "Bearer " + getToken() } : {}),
      ...(opts.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

export const api = {
  register: (name: string, email: string, password: string) =>
    req("/api/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) }),
  login: (email: string, password: string) =>
    req("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  logout: () => req("/api/auth/logout", { method: "POST" }).finally(() => setToken(null)),
  me: () => req("/api/auth/me"),
  resetRequest: (email: string) =>
    req("/api/auth/reset", { method: "POST", body: JSON.stringify({ email }) }),
  startCheckout: (slug: string, email: string) =>
    req("/api/create-paypal-order", { method: "POST", body: JSON.stringify({ key: slug, email, returnPath: "success" }) }),
  contact: (f: { name: string; email: string; subject: string; message: string }) =>
    req("/api/contact", { method: "POST", body: JSON.stringify(f) }),
};
