(() => {
  const A = window.SliferAuth;
  if (!A) return;

  const accountBtn = document.getElementById("account-btn");
  const accountMenu = document.getElementById("account-menu");
  const accountAvatar = document.getElementById("account-avatar");
  const accountFallback = document.getElementById("account-fallback");
  const accountName = document.getElementById("account-name");
  const accountEmail = document.getElementById("account-email");
  const overlay = document.getElementById("auth-overlay");
  const closeBtn = document.getElementById("auth-close");
  const titleEl = document.getElementById("auth-title");
  const gateEl = document.getElementById("auth-gate");
  const passwordEl = document.getElementById("auth-password");
  const forgotEl = document.getElementById("auth-forgot");
  const loginForm = document.getElementById("auth-login");
  const registerForm = document.getElementById("auth-register");
  const passwordForm = document.getElementById("auth-password-form");
  const forgotRequestForm = document.getElementById("auth-forgot-request");
  const forgotResetForm = document.getElementById("auth-forgot-reset");
  const loginError = document.getElementById("login-error");
  const registerError = document.getElementById("register-error");
  const passwordError = document.getElementById("password-error");
  const passwordOk = document.getElementById("password-ok");
  const forgotError = document.getElementById("forgot-error");
  const forgotOk = document.getElementById("forgot-ok");
  const tabs = document.querySelectorAll("[data-auth-tab]");

  if (!accountBtn || !overlay) return;

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

  function menuIsOpen() {
    return Boolean(accountMenu?.classList.contains("is-open"));
  }

  function closeMenu() {
    if (!accountMenu) return;
    accountMenu.classList.remove("is-open");
    accountMenu.hidden = true;
    accountBtn.setAttribute("aria-expanded", "false");
  }

  function openMenu() {
    if (!accountMenu) return;
    accountMenu.hidden = false;
    accountMenu.classList.add("is-open");
    accountBtn.setAttribute("aria-expanded", "true");
  }

  function refreshAccountChrome() {
    const session = A.loadSession();
    if (session) {
      accountBtn.dataset.signedIn = "1";
      accountBtn.setAttribute("aria-label", `Account: ${A.displayName(session.user)}`);
      accountBtn.setAttribute("aria-haspopup", "menu");
      if (accountName) {
        accountName.hidden = false;
        accountName.textContent = A.displayName(session.user);
      }
      if (accountEmail) {
        const email = session.user?.email || "";
        accountEmail.hidden = !email;
        accountEmail.textContent = email;
      }
      A.paintAvatarPair(accountAvatar, accountFallback, session.user);
    } else {
      delete accountBtn.dataset.signedIn;
      accountBtn.setAttribute("aria-label", "Account");
      accountBtn.setAttribute("aria-haspopup", "dialog");
      closeMenu();
      if (accountName) {
        accountName.hidden = true;
        accountName.textContent = "";
      }
      if (accountEmail) {
        accountEmail.hidden = true;
        accountEmail.textContent = "";
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

  function showOverlayPanel(panel) {
    if (gateEl) gateEl.hidden = panel !== "gate";
    if (passwordEl) passwordEl.hidden = panel !== "password";
    if (forgotEl) forgotEl.hidden = panel !== "forgot";
  }

  function openOverlay(panel) {
    closeMenu();
    showOverlayPanel(panel);
    if (panel === "gate") setTab("login");
    if (panel === "password") {
      showError(passwordError, "");
      showError(passwordOk, "");
      passwordForm?.reset();
    }
    if (panel === "forgot") {
      showError(forgotError, "");
      showError(forgotOk, "");
      forgotRequestForm?.reset();
      forgotResetForm?.reset();
      if (forgotRequestForm) forgotRequestForm.hidden = false;
      if (forgotResetForm) forgotResetForm.hidden = true;
      const session = A.loadSession();
      const emailInput = forgotRequestForm?.querySelector('input[name="email"]');
      if (emailInput && session?.user?.email) {
        emailInput.value = session.user.email;
      }
    }
    overlay.hidden = false;
    document.body.classList.add("auth-open");
    const first = overlay.querySelector(
      'input:not([type="hidden"]):not([hidden]), button:not([hidden])',
    );
    first?.focus?.();
  }

  function closeOverlay() {
    overlay.hidden = true;
    document.body.classList.remove("auth-open");
    accountBtn.focus();
  }

  function signOut() {
    A.clearSession();
    closeMenu();
    closeOverlay();
    refreshAccountChrome();
    if (location.pathname.endsWith("/profile.html") || location.pathname.endsWith("/profile")) {
      location.href = "/";
    }
  }

  accountBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (A.loadSession()) {
      if (menuIsOpen()) closeMenu();
      else openMenu();
      return;
    }
    openOverlay("gate");
  });

  accountMenu?.addEventListener("click", (e) => {
    // Keep menu open for in-menu controls; links navigate normally.
    e.stopPropagation();
  });

  document.querySelectorAll("[data-account-action]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const action = btn.getAttribute("data-account-action");
      if (action === "signout") {
        signOut();
        return;
      }
      if (action === "password") {
        openOverlay("password");
        return;
      }
      if (action === "forgot") {
        openOverlay("forgot");
      }
    });
  });

  document.querySelectorAll("[data-open-forgot]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      openOverlay("forgot");
    });
  });

  closeBtn?.addEventListener("click", closeOverlay);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeOverlay();
  });
  addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!overlay.hidden) closeOverlay();
      else closeMenu();
    }
  });
  // Ignore clicks inside the chip/menu so open isn't instantly closed.
  addEventListener("click", (e) => {
    const t = e.target;
    if (t instanceof Element && t.closest(".account-wrap")) return;
    closeMenu();
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
        ? await A.apiFetch("/auth/login", {
            method: "POST",
            body: { email: identifier.toLowerCase(), password },
          })
        : await A.apiFetch("/auth/login-username", {
            method: "POST",
            body: { username: identifier, password },
          });
      await A.enrichSession(data.token, data.user);
      refreshAccountChrome();
      closeOverlay();
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
      const data = await A.apiFetch("/auth/register-player", {
        method: "POST",
        body: { username, email, password },
      });
      await A.enrichSession(data.token, data.user);
      refreshAccountChrome();
      closeOverlay();
    } catch (err) {
      showError(registerError, err instanceof Error ? err.message : String(err));
    } finally {
      if (submit) submit.disabled = false;
    }
  });

  passwordForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    showError(passwordError, "");
    showError(passwordOk, "");
    const session = A.loadSession();
    if (!session) {
      openOverlay("gate");
      return;
    }
    const fd = new FormData(passwordForm);
    const email = String(fd.get("email") || "").trim().toLowerCase();
    const currentPassword = String(fd.get("currentPassword") || "");
    const newPassword = String(fd.get("newPassword") || "");
    const submit = passwordForm.querySelector('button[type="submit"]');
    if (submit) submit.disabled = true;
    try {
      await A.apiFetch("/auth/me/password", {
        method: "PATCH",
        token: session.token,
        body: { email, currentPassword, newPassword },
      });
      showError(passwordOk, "Password updated.");
      passwordForm.reset();
    } catch (err) {
      showError(passwordError, err instanceof Error ? err.message : String(err));
    } finally {
      if (submit) submit.disabled = false;
    }
  });

  forgotRequestForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    showError(forgotError, "");
    showError(forgotOk, "");
    const fd = new FormData(forgotRequestForm);
    const email = String(fd.get("email") || "").trim().toLowerCase();
    const submit = forgotRequestForm.querySelector('button[type="submit"]');
    if (submit) submit.disabled = true;
    try {
      const data = await A.apiFetch("/auth/forgot-password", {
        method: "POST",
        body: { email },
      });
      showError(forgotOk, data?.message || "If that email is registered, a reset code was sent.");
      if (forgotRequestForm) forgotRequestForm.hidden = true;
      if (forgotResetForm) {
        forgotResetForm.hidden = false;
        const emailField = forgotResetForm.querySelector('input[name="email"]');
        if (emailField) emailField.value = email;
      }
    } catch (err) {
      showError(forgotError, err instanceof Error ? err.message : String(err));
    } finally {
      if (submit) submit.disabled = false;
    }
  });

  forgotResetForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    showError(forgotError, "");
    showError(forgotOk, "");
    const fd = new FormData(forgotResetForm);
    const email = String(fd.get("email") || "").trim().toLowerCase();
    const code = String(fd.get("code") || "").trim();
    const newPassword = String(fd.get("newPassword") || "");
    const submit = forgotResetForm.querySelector('button[type="submit"]');
    if (submit) submit.disabled = true;
    try {
      await A.apiFetch("/auth/reset-password", {
        method: "POST",
        body: { email, code, newPassword },
      });
      showError(forgotOk, "Password reset. You can sign in now.");
      forgotResetForm.reset();
      setTimeout(() => openOverlay("gate"), 700);
    } catch (err) {
      showError(forgotError, err instanceof Error ? err.message : String(err));
    } finally {
      if (submit) submit.disabled = false;
    }
  });

  refreshAccountChrome();
  const existing = A.loadSession();
  if (existing) {
    A.enrichSession(existing.token, existing.user).then(() => {
      refreshAccountChrome();
      window.dispatchEvent(new CustomEvent("slifer:session", { detail: A.loadSession() }));
    });
  }

  window.SliferAccount = { refreshAccountChrome, openOverlay, closeOverlay };
})();
