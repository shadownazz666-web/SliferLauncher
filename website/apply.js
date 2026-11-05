(() => {
  const A = window.SliferAuth;
  if (!A) return;

  const gate = document.getElementById("apply-gate");
  const statusEl = document.getElementById("apply-status");
  const statusInner = document.getElementById("apply-status-inner");
  const formWrap = document.getElementById("apply-form-wrap");
  const form = document.getElementById("apply-form");
  const errorEl = document.getElementById("apply-error");
  const submitBtn = document.getElementById("apply-submit");
  const signinBtn = document.getElementById("apply-signin");

  function showError(message) {
    if (!errorEl) return;
    if (!message) {
      errorEl.hidden = true;
      errorEl.textContent = "";
      return;
    }
    errorEl.hidden = false;
    errorEl.textContent = message;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function statusLabel(status) {
    if (status === "pending") return "Under review";
    if (status === "approved") return "Approved";
    if (status === "denied") return "Declined";
    return status;
  }

  function renderStatus(app) {
    if (!statusInner || !statusEl) return;
    const note = app.reviewNote
      ? `<p class="status-card__note glass-text">${escapeHtml(app.reviewNote)}</p>`
      : "";
    statusInner.innerHTML = `
      <p class="status-card__kicker">Your application</p>
      <p class="status-card__badge status-card__badge--${escapeHtml(app.status)}">${escapeHtml(
        statusLabel(app.status),
      )}</p>
      <h2 class="status-card__title chrome-type">${escapeHtml(app.displayName)}</h2>
      <p class="status-card__pitch glass-text">${escapeHtml(app.pitch)}</p>
      ${note}
    `;
    statusEl.hidden = false;
  }

  async function load() {
    const session = A.loadSession();
    if (!session?.token) {
      if (gate) gate.hidden = false;
      if (statusEl) statusEl.hidden = true;
      if (formWrap) formWrap.hidden = true;
      return;
    }

    if (gate) gate.hidden = true;

    let user = session.user;
    try {
      user = await A.enrichSession(session.token, session.user);
    } catch {
      // keep cached
    }

    if (user?.canUploadGames) {
      if (statusInner && statusEl) {
        statusInner.innerHTML = `
          <p class="status-card__kicker">Developer access</p>
          <p class="status-card__badge status-card__badge--approved">Active</p>
          <h2 class="status-card__title chrome-type">You’re cleared to ship</h2>
          <p class="status-card__pitch glass-text">
            Upload and manage titles from the Slifer launcher store tools.
          </p>
        `;
        statusEl.hidden = false;
      }
      if (formWrap) formWrap.hidden = true;
      return;
    }

    try {
      const data = await A.apiFetch("/staff/applications/mine", {
        token: session.token,
      });
      const app = data?.application;
      if (app) {
        renderStatus(app);
        if (formWrap) formWrap.hidden = app.status === "pending" || app.status === "approved";
        if (app.status === "denied" && formWrap) {
          formWrap.hidden = false;
          if (form) {
            form.displayName.value = app.displayName || user?.displayName || "";
            form.contactEmail.value = app.contactEmail || user?.email || "";
            form.portfolioUrl.value = app.portfolioUrl || "";
          }
        }
        return;
      }
    } catch (err) {
      showError(err?.message || "Could not load application");
    }

    if (statusEl) statusEl.hidden = true;
    if (formWrap) formWrap.hidden = false;
    if (form && user) {
      if (!form.displayName.value) form.displayName.value = user.displayName || "";
      if (!form.contactEmail.value) form.contactEmail.value = user.email || "";
    }
  }

  signinBtn?.addEventListener("click", () => {
    document.getElementById("account-btn")?.click();
  });

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    showError("");
    const session = A.loadSession();
    if (!session?.token) {
      showError("Sign in first");
      return;
    }
    const fd = new FormData(form);
    const body = {
      displayName: String(fd.get("displayName") || "").trim(),
      contactEmail: String(fd.get("contactEmail") || "").trim(),
      portfolioUrl: String(fd.get("portfolioUrl") || "").trim() || null,
      pitch: String(fd.get("pitch") || "").trim(),
    };
    if (submitBtn) submitBtn.disabled = true;
    try {
      const data = await A.apiFetch("/staff/applications", {
        method: "POST",
        token: session.token,
        body,
      });
      if (data?.application) {
        renderStatus(data.application);
        if (formWrap) formWrap.hidden = true;
      }
    } catch (err) {
      showError(err?.message || "Submit failed");
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  window.addEventListener("slifer:session", () => {
    load();
  });

  load();
})();
