// Handles signup/login/logout and persisting the JWT in localStorage so the
// user stays logged in across page refreshes. This is real project code
// that runs on the user's own machine (not a Claude.ai artifact preview),
// so localStorage works normally here.

const TOKEN_KEY = "outbound_token";
const USER_KEY = "outbound_user";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

function persistSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function handleAuthResponse(res) {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  persistSession(data.token, data.user);
  return data.user;
}

export async function signup(email, password) {
  const res = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handleAuthResponse(res);
}

export async function login(email, password) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handleAuthResponse(res);
}

/** Adds the Authorization header to fetch options if a token exists. */
export function withAuth(options = {}) {
  const token = getToken();
  return {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
}
