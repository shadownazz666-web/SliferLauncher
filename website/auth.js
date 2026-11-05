(() => {
  // Same-origin /api — nginx in prod, website/dev-server.mjs locally.
  const API_BASE = "/api";
  const SESSION_KEY = "slifer.web.session";
  const DOWNLOAD_URL =
    "https://github.com/shadownazz666-web/SliferLauncher/releases/latest/download/SliferLauncher_Setup.exe";

  function loadSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data?.token || !data?.user) return null;
      return data;
    } catch {
      return null;
    }
  }

  function saveSession(token, user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ token, user }));
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  function displayName(user) {
    return user?.username || user?.displayName || user?.email || "Player";
  }

  function mediaUrl(path) {
    if (!path) return null;
    if (/^https?:\/\//i.test(path) || path.startsWith("data:")) return path;
    return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  }

  function initials(name) {
    const parts = String(name || "P")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!parts.length) return "P";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  function formatStatus(user) {
    const status = String(user?.status || "offline").toLowerCase();
    const label =
      status === "online" ? "Online" : status === "away" ? "Away" : "Offline";
    const activity = user?.activity ? ` · ${user.activity}` : "";
    return `${label}${activity}`;
  }

  function paintAvatarPair(imgEl, fallbackEl, user) {
    const url = mediaUrl(user?.avatarUrl);
    const mark = initials(displayName(user));
    if (!url) {
      if (imgEl) {
        imgEl.hidden = true;
        imgEl.removeAttribute("src");
      }
      if (fallbackEl) {
        fallbackEl.hidden = false;
        fallbackEl.textContent = mark;
      }
      return;
    }
    if (fallbackEl) fallbackEl.hidden = true;
    if (!imgEl) return;
    imgEl.hidden = false;
    imgEl.onerror = () => {
      imgEl.hidden = true;
      imgEl.removeAttribute("src");
      if (fallbackEl) {
        fallbackEl.hidden = false;
        fallbackEl.textContent = mark;
      }
    };
    imgEl.onload = () => {
      if (fallbackEl) fallbackEl.hidden = true;
      imgEl.hidden = false;
    };
    imgEl.src = url;
  }

  async function apiFetch(path, { method = "GET", body, token } = {}) {
    const headers = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    if (!res.ok) {
      const err = data?.error || `Request failed (${res.status})`;
      throw new Error(typeof err === "string" ? err : "Request failed");
    }
    return data;
  }

  async function enrichSession(token, user) {
    let next = { ...user };
    try {
      const data = await apiFetch("/social/me", { token });
      if (data?.user) {
        next = {
          ...next,
          ...data.user,
          username: data.user.username ?? next.username,
          displayName: data.user.displayName ?? next.displayName,
          avatarUrl: data.user.avatarUrl ?? null,
          status: data.user.status ?? next.status,
          activity: data.user.activity ?? next.activity ?? null,
          email: data.user.email ?? next.email,
          role: data.user.role ?? next.role,
        };
      }
    } catch {
      // keep existing session payload
    }
    try {
      const caps = await apiFetch("/staff/me", { token });
      next = {
        ...next,
        role: caps.role ?? next.role,
        canReviewApps: Boolean(caps.canReviewApps),
        canManageStaff: Boolean(caps.canManageStaff),
        canUploadGames: Boolean(caps.canUploadGames),
      };
    } catch {
      // older API — derive from role
      const role = next.role || "player";
      next.canReviewApps = role === "owner" || role === "admin";
      next.canManageStaff = role === "owner";
      next.canUploadGames =
        role === "owner" || role === "admin" || role === "dev";
    }
    saveSession(token, next);
    return next;
  }

  function roleLabel(role) {
    if (role === "owner") return "Owner";
    if (role === "admin") return "Admin";
    if (role === "mod") return "Moderator";
    if (role === "dev") return "Developer";
    return "Player";
  }

  window.SliferAuth = {
    API_BASE,
    DOWNLOAD_URL,
    loadSession,
    saveSession,
    clearSession,
    displayName,
    mediaUrl,
    initials,
    formatStatus,
    paintAvatarPair,
    apiFetch,
    enrichSession,
    roleLabel,
  };
})();
