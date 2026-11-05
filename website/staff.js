(() => {
  const A = window.SliferAuth;
  if (!A) return;

  const gate = document.getElementById("staff-gate");
  const gateMsg = document.getElementById("staff-gate-msg");
  const body = document.getElementById("staff-body");
  const appsList = document.getElementById("apps-list");
  const appsHint = document.getElementById("apps-hint");
  const rolesSection = document.getElementById("roles-section");
  const membersList = document.getElementById("members-list");
  const roleForm = document.getElementById("role-form");
  const roleResult = document.getElementById("role-result");
  const roleError = document.getElementById("role-error");
  const roleOk = document.getElementById("role-ok");
  const lookupBtn = document.getElementById("role-lookup");
  const signinBtn = document.getElementById("staff-signin");
  const pills = document.querySelectorAll(".filter-pill");

  let filterStatus = "pending";
  let lookupUser = null;

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function showMsg(el, message) {
    if (!el) return;
    if (!message) {
      el.hidden = true;
      el.textContent = "";
      return;
    }
    el.hidden = false;
    el.textContent = message;
  }

  function media(url) {
    return A.mediaUrl(url);
  }

  function avatarHtml(user) {
    const src = media(user.avatarUrl);
    if (src) {
      return `<img class="app-card__avatar" src="${escapeHtml(src)}" alt="" />`;
    }
    const initials = A.initials(user.displayName || user.username || "?");
    return `<span class="app-card__fallback" aria-hidden="true">${escapeHtml(initials)}</span>`;
  }

  function formatWhen(iso) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return iso;
    }
  }

  async function reviewApp(id, status) {
    const session = A.loadSession();
    if (!session?.token) return;
    const note =
      status === "denied"
        ? window.prompt("Optional note for the applicant:", "") || null
        : null;
    try {
      await A.apiFetch(`/staff/applications/${encodeURIComponent(id)}/review`, {
        method: "POST",
        token: session.token,
        body: { status, note },
      });
      await loadApps();
    } catch (err) {
      window.alert(err?.message || "Review failed");
    }
  }

  function renderApps(applications) {
    if (!appsList) return;
    if (!applications.length) {
      appsList.innerHTML = "";
      if (appsHint) {
        appsHint.hidden = false;
        appsHint.textContent =
          filterStatus === "pending"
            ? "No pending applications — queue is clear."
            : "Nothing in this filter yet.";
      }
      return;
    }
    if (appsHint) appsHint.hidden = true;
    appsList.innerHTML = applications
      .map((app) => {
        const handle = app.username ? `@${app.username}` : "no username";
        const portfolio = app.portfolioUrl
          ? `<a class="app-card__link" href="${escapeHtml(
              app.portfolioUrl,
            )}" target="_blank" rel="noopener noreferrer">Portfolio</a>`
          : "";
        const actions =
          app.status === "pending"
            ? `<div class="app-card__actions">
                <button type="button" class="pill-btn pill-btn--ok" data-review="approved" data-id="${escapeHtml(
                  app.id,
                )}">Approve</button>
                <button type="button" class="pill-btn pill-btn--danger" data-review="denied" data-id="${escapeHtml(
                  app.id,
                )}">Deny</button>
              </div>`
            : `<p class="app-card__meta glass-text">${escapeHtml(
                app.status,
              )} · ${escapeHtml(formatWhen(app.reviewedAt || app.createdAt))}</p>`;

        return `
          <article class="app-card glass-panel glass-panel--sm" data-reveal>
            <div class="app-card__head">
              ${avatarHtml(app)}
              <div class="app-card__who">
                <h3 class="app-card__name">${escapeHtml(app.displayName)}</h3>
                <p class="app-card__handle glass-text">${escapeHtml(handle)} · ${escapeHtml(
                  app.contactEmail,
                )}</p>
              </div>
              <span class="status-chip status-chip--${escapeHtml(app.status)}">${escapeHtml(
                app.status,
              )}</span>
            </div>
            <p class="app-card__pitch">${escapeHtml(app.pitch)}</p>
            <div class="app-card__foot">
              ${portfolio}
              <span class="app-card__when glass-text">${escapeHtml(
                formatWhen(app.createdAt),
              )}</span>
            </div>
            ${actions}
          </article>
        `;
      })
      .join("");

    appsList.querySelectorAll("[data-review]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const status = btn.getAttribute("data-review");
        if (id && status) reviewApp(id, status);
      });
    });
  }

  async function loadApps() {
    const session = A.loadSession();
    if (!session?.token) return;
    try {
      const data = await A.apiFetch(
        `/staff/applications?status=${encodeURIComponent(filterStatus)}`,
        { token: session.token },
      );
      renderApps(data?.applications || []);
    } catch (err) {
      if (appsHint) {
        appsHint.hidden = false;
        appsHint.textContent = err?.message || "Could not load applications";
      }
    }
  }

  function renderMembers(members) {
    if (!membersList) return;
    if (!members.length) {
      membersList.innerHTML = `<p class="desk__hint glass-text">No staff members yet.</p>`;
      return;
    }
    membersList.innerHTML = members
      .map((m) => {
        const handle = m.username ? `@${m.username}` : m.email;
        const canEdit = m.role !== "owner";
        const select = canEdit
          ? `<select class="role-select" data-user-id="${escapeHtml(m.id)}" aria-label="Role for ${escapeHtml(
              m.displayName,
            )}">
              ${["player", "dev", "mod", "admin"]
                .map(
                  (r) =>
                    `<option value="${r}" ${m.role === r ? "selected" : ""}>${A.roleLabel(
                      r,
                    )}</option>`,
                )
                .join("")}
            </select>`
          : `<span class="status-chip status-chip--owner">Owner</span>`;
        return `
          <article class="member-card glass-panel glass-panel--sm">
            <div class="member-card__who">
              ${avatarHtml(m)}
              <div>
                <h3 class="app-card__name">${escapeHtml(m.displayName)}</h3>
                <p class="app-card__handle glass-text">${escapeHtml(handle)}</p>
              </div>
            </div>
            ${select}
          </article>
        `;
      })
      .join("");

    membersList.querySelectorAll(".role-select").forEach((sel) => {
      sel.addEventListener("change", async () => {
        const userId = sel.getAttribute("data-user-id");
        const role = sel.value;
        const session = A.loadSession();
        if (!session?.token || !userId) return;
        try {
          await A.apiFetch("/staff/members/role", {
            method: "POST",
            token: session.token,
            body: { userId, role },
          });
          await loadMembers();
        } catch (err) {
          window.alert(err?.message || "Role update failed");
          await loadMembers();
        }
      });
    });
  }

  async function loadMembers() {
    const session = A.loadSession();
    if (!session?.token) return;
    try {
      const data = await A.apiFetch("/staff/members", { token: session.token });
      renderMembers(data?.members || []);
    } catch (err) {
      if (membersList) {
        membersList.innerHTML = `<p class="auth-error">${escapeHtml(
          err?.message || "Could not load members",
        )}</p>`;
      }
    }
  }

  function renderLookup(user) {
    if (!roleResult) return;
    if (!user) {
      roleResult.hidden = true;
      roleResult.innerHTML = "";
      return;
    }
    roleResult.hidden = false;
    roleResult.innerHTML = `
      <div class="lookup-card">
        ${avatarHtml(user)}
        <div class="lookup-card__meta">
          <strong>${escapeHtml(user.displayName)}</strong>
          <span class="glass-text">@${escapeHtml(user.username || "—")} · ${escapeHtml(
            A.roleLabel(user.role),
          )}</span>
        </div>
        <select class="role-select" id="lookup-role" ${
          user.role === "owner" ? "disabled" : ""
        }>
          ${["player", "dev", "mod", "admin"]
            .map(
              (r) =>
                `<option value="${r}" ${user.role === r ? "selected" : ""}>${A.roleLabel(
                  r,
                )}</option>`,
            )
            .join("")}
        </select>
        <button type="button" class="pill-btn pill-btn--ok" id="lookup-assign" ${
          user.role === "owner" ? "disabled" : ""
        }>Assign</button>
      </div>
    `;
    document.getElementById("lookup-assign")?.addEventListener("click", async () => {
      const role = document.getElementById("lookup-role")?.value;
      const session = A.loadSession();
      if (!session?.token || !role || !lookupUser) return;
      showMsg(roleError, "");
      showMsg(roleOk, "");
      try {
        await A.apiFetch("/staff/members/role", {
          method: "POST",
          token: session.token,
          body: { userId: lookupUser.id, role },
        });
        showMsg(roleOk, `Set ${lookupUser.username || lookupUser.displayName} to ${A.roleLabel(role)}`);
        lookupUser = { ...lookupUser, role };
        await loadMembers();
        renderLookup(lookupUser);
      } catch (err) {
        showMsg(roleError, err?.message || "Assign failed");
      }
    });
  }

  async function doLookup() {
    const session = A.loadSession();
    if (!session?.token || !roleForm) return;
    showMsg(roleError, "");
    showMsg(roleOk, "");
    const username = String(new FormData(roleForm).get("username") || "").trim();
    if (username.length < 2) {
      showMsg(roleError, "Enter a username");
      return;
    }
    try {
      const data = await A.apiFetch(
        `/staff/users/lookup?username=${encodeURIComponent(username)}`,
        { token: session.token },
      );
      lookupUser = data?.user || null;
      renderLookup(lookupUser);
    } catch (err) {
      lookupUser = null;
      renderLookup(null);
      showMsg(roleError, err?.message || "User not found");
    }
  }

  async function load() {
    const session = A.loadSession();
    if (!session?.token) {
      if (gate) gate.hidden = false;
      if (gateMsg) gateMsg.textContent = "Sign in with an Admin or Owner account.";
      if (body) body.hidden = true;
      return;
    }

    let user = session.user;
    try {
      user = await A.enrichSession(session.token, session.user);
    } catch {
      // keep
    }

    if (!user?.canReviewApps) {
      if (gate) gate.hidden = false;
      if (gateMsg) {
        gateMsg.textContent = "This desk is for Admins and the Owner.";
      }
      if (body) body.hidden = true;
      return;
    }

    if (gate) gate.hidden = true;
    if (body) body.hidden = false;

    if (rolesSection) {
      rolesSection.hidden = !user.canManageStaff;
    }

    await loadApps();
    if (user.canManageStaff) await loadMembers();
  }

  pills.forEach((pill) => {
    pill.addEventListener("click", () => {
      pills.forEach((p) => p.classList.remove("is-active"));
      pill.classList.add("is-active");
      filterStatus = pill.getAttribute("data-status") || "pending";
      loadApps();
    });
  });

  signinBtn?.addEventListener("click", () => {
    document.getElementById("account-btn")?.click();
  });

  lookupBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    doLookup();
  });

  roleForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    doLookup();
  });

  window.addEventListener("slifer:session", () => {
    load();
  });

  load();
})();
