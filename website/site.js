(() => {
  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Soft custom scroll feel via CSS scroll-behavior + reveal classes
  document.documentElement.classList.add("js-ready");

  const reveals = document.querySelectorAll("[data-reveal]");
  if (!reduceMotion && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" },
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("is-in"));
  }

  // Fancy scroll progress + parallax glass depth
  const progress = document.querySelector(".scroll-progress__bar");
  const parallaxEls = document.querySelectorAll("[data-parallax]");
  let ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const max = document.documentElement.scrollHeight - innerHeight;
      const y = scrollY;
      const p = max > 0 ? y / max : 0;
      if (progress) progress.style.transform = `scaleX(${p})`;

      if (!reduceMotion) {
        parallaxEls.forEach((el) => {
          const speed = Number(el.getAttribute("data-parallax") || "0.12");
          const rect = el.getBoundingClientRect();
          const mid = rect.top + rect.height / 2 - innerHeight / 2;
          el.style.setProperty("--py", `${(-mid * speed).toFixed(2)}px`);
        });
      }
      ticking = false;
    });
  }

  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Glow follow on primary CTA
  document.querySelectorAll(".cta-glow").forEach((btn) => {
    btn.addEventListener("pointermove", (e) => {
      const r = btn.getBoundingClientRect();
      btn.style.setProperty("--mx", `${e.clientX - r.left}px`);
      btn.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  });

  // ===== Auth (same store-api accounts as the launcher) =====
  const API_BASE = "/api";
  const SESSION_KEY = "slifer.web.session";

  const accountBtn = document.getElementById("account-btn");
  const accountAvatar = document.getElementById("account-avatar");
  const accountFallback = document.getElementById("account-fallback");
  const accountName = document.getElementById("account-name");
  const overlay = document.getElementById("auth-overlay");
  const closeBtn = document.getElementById("auth-close");
  const titleEl = document.getElementById("auth-title");
  const loginForm = document.getElementById("auth-login");
  const registerForm = document.getElementById("auth-register");
  const sessionPanel = document.getElementById("auth-session");
  const sessionName = document.getElementById("auth-session-name");
  const signOutBtn = document.getElementById("auth-signout");
  const loginError = document.getElementById("login-error");
  const registerError = document.getElementById("register-error");
  const tabs = document.querySelectorAll("[data-auth-tab]");
  const hintEl = document.querySelector(".auth-modal__hint");

  if (!accountBtn || !overlay) return;

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

  function showFallbackAvatar(user) {
    if (accountAvatar) {
      accountAvatar.hidden = true;
      accountAvatar.removeAttribute("src");
    }
    if (accountFallback) {
      accountFallback.hidden = false;
      accountFallback.textContent = initials(displayName(user));
    }
  }

  function setAvatar(user) {
    const url = mediaUrl(user?.avatarUrl);
    if (!url) {
      showFallbackAvatar(user);
      return;
    }
    if (accountFallback) accountFallback.hidden = true;
    if (!accountAvatar) return;
    accountAvatar.hidden = false;
    accountAvatar.onerror = () => showFallbackAvatar(user);
    accountAvatar.onload = () => {
      if (accountFallback) accountFallback.hidden = true;
      accountAvatar.hidden = false;
    };
    accountAvatar.src = url;
  }

  function refreshAccountChrome() {
    const session = loadSession();
    if (session) {
      accountBtn.dataset.signedIn = "1";
      accountBtn.setAttribute("aria-label", `Account: ${displayName(session.user)}`);
      if (accountName) {
        accountName.hidden = false;
        accountName.textContent = displayName(session.user);
      }
      setAvatar(session.user);
    } else {
      delete accountBtn.dataset.signedIn;
      accountBtn.setAttribute("aria-label", "Account");
      if (accountName) {
        accountName.hidden = true;
        accountName.textContent = "";
      }
      if (accountAvatar) {
        accountAvatar.hidden = true;
        accountAvatar.removeAttribute("src");
      }
      if (accountFallback) {
        accountFallback.hidden = true;
        accountFallback.textContent = "";
      }
    }
  }

  function showError(el, message) {
    if (!el) return;
    if (!message) {
      el.hidden = true;
      el.textContent = "";
      return;
    }
    el.hidden = false;
    el.textContent = message;
  }

  function setTab(which) {
    const isLogin = which === "login";
    tabs.forEach((tab) => {
      const active = tab.getAttribute("data-auth-tab") === which;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });
    if (titleEl) titleEl.textContent = isLogin ? "Sign in" : "Create account";
    if (loginForm) loginForm.hidden = !isLogin;
    if (registerForm) registerForm.hidden = isLogin;
    showError(loginError, "");
    showError(registerError, "");
  }

  function paintModal() {
    const session = loadSession();
    const signedIn = Boolean(session);
    if (sessionPanel) sessionPanel.hidden = !signedIn;
    if (hintEl) hintEl.hidden = signedIn;
    tabs.forEach((tab) => {
      tab.hidden = signedIn;
    });
    if (signedIn) {
      if (loginForm) loginForm.hidden = true;
      if (registerForm) registerForm.hidden = true;
      if (titleEl) titleEl.textContent = "Account";
      if (sessionName) sessionName.textContent = displayName(session.user);
    } else {
      setTab("login");
    }
  }

  function openModal() {
    paintModal();
    overlay.hidden = false;
    document.body.classList.add("auth-open");
    const first = overlay.querySelector(
      'input:not([type="hidden"]):not([hidden]), button:not([hidden])',
    );
    first?.focus?.();
  }

  function closeModal() {
    overlay.hidden = true;
    document.body.classList.remove("auth-open");
    accountBtn.focus();
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
        };
      }
    } catch {
      // Auth still valid even if social profile is unreachable
    }
    saveSession(token, next);
    return next;
  }

  accountBtn.addEventListener("click", openModal);
  closeBtn?.addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });
  addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.hidden) closeModal();
  });

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      setTab(tab.getAttribute("data-auth-tab") || "login");
    });
  });

  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    showError(loginError, "");
    const fd = new FormData(loginForm);
    const identifier = String(fd.get("identifier") || "").trim();
    const password = String(fd.get("password") || "");
    const submit = loginForm.querySelector('button[type="submit"]');
    if (submit) submit.disabled = true;
    try {
      const looksEmail = identifier.includes("@");
      const data = looksEmail
        ? await apiFetch("/auth/login", {
            method: "POST",
            body: { email: identifier.toLowerCase(), password },
          })
        : await apiFetch("/auth/login-username", {
            method: "POST",
            body: { username: identifier, password },
          });
      await enrichSession(data.token, data.user);
      refreshAccountChrome();
      paintModal();
    } catch (err) {
      showError(loginError, err instanceof Error ? err.message : String(err));
    } finally {
      if (submit) submit.disabled = false;
    }
  });

  registerForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    showError(registerError, "");
    const fd = new FormData(registerForm);
    const username = String(fd.get("username") || "").trim();
    const email = String(fd.get("email") || "").trim().toLowerCase();
    const password = String(fd.get("password") || "");
    const submit = registerForm.querySelector('button[type="submit"]');
    if (submit) submit.disabled = true;
    try {
      const data = await apiFetch("/auth/register-player", {
        method: "POST",
        body: { username, email, password },
      });
      await enrichSession(data.token, data.user);
      refreshAccountChrome();
      paintModal();
    } catch (err) {
      showError(registerError, err instanceof Error ? err.message : String(err));
    } finally {
      if (submit) submit.disabled = false;
    }
  });

  signOutBtn?.addEventListener("click", () => {
    clearSession();
    refreshAccountChrome();
    paintModal();
  });

  refreshAccountChrome();
  const existing = loadSession();
  if (existing) {
    enrichSession(existing.token, existing.user).then(() => {
      refreshAccountChrome();
    });
  }
})();
