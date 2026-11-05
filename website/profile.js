(() => {
  const A = window.SliferAuth;
  if (!A) return;

  const loading = document.getElementById("profile-loading");
  const body = document.getElementById("profile-body");
  const empty = document.getElementById("profile-empty");
  const avatar = document.getElementById("profile-avatar");
  const fallback = document.getElementById("profile-fallback");
  const nameEl = document.getElementById("profile-name");
  const roleEl = document.getElementById("profile-role");
  const sinceEl = document.getElementById("profile-since");
  const actionsEl = document.getElementById("profile-actions");
  const staffBtn = document.getElementById("profile-staff");
  const devBtn = document.getElementById("profile-dev");
  const repEl = document.getElementById("profile-rep");
  const signInBtn = document.getElementById("profile-signin");

  function formatMemberSince(user) {
    const raw = user?.createdAt || user?.created_at || null;
    if (!raw) return "Member since —";
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return "Member since —";
    const formatted = date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    return `Member since ${formatted}`;
  }

  /** Site only displays rep; value comes from API (community + store interactions). */
  function paintRep(user) {
    if (!repEl) return;
    const raw = user?.rep ?? user?.reputation ?? 0;
    const value = Number(raw);
    const n = Number.isFinite(value) ? Math.trunc(value) : 0;
    repEl.hidden = false;
    repEl.classList.remove("is-pos", "is-neg", "is-zero");
    if (n > 0) {
      repEl.classList.add("is-pos");
      repEl.textContent = `+${n}`;
    } else if (n < 0) {
      repEl.classList.add("is-neg");
      repEl.textContent = `${n}`; // already has leading "-"
    } else {
      repEl.classList.add("is-zero");
      repEl.textContent = "0";
    }
  }

  function paint(session) {
    if (loading) loading.hidden = true;
    if (!session?.user) {
      if (body) body.hidden = true;
      if (empty) empty.hidden = false;
      if (actionsEl) actionsEl.hidden = true;
      if (staffBtn) staffBtn.hidden = true;
      if (devBtn) devBtn.hidden = true;
      return;
    }
    if (empty) empty.hidden = true;
    if (body) body.hidden = false;
    if (nameEl) nameEl.textContent = A.displayName(session.user);
    if (roleEl) {
      const role = session.user?.role || "player";
      roleEl.hidden = false;
      roleEl.textContent = A.roleLabel(role);
    }
    if (sinceEl) sinceEl.textContent = formatMemberSince(session.user);

    const role = session.user?.role || "player";
    const showStaff =
      Boolean(session.user?.canReviewApps) || role === "owner" || role === "admin";
    const showDev =
      Boolean(session.user?.canUploadGames) ||
      role === "dev" ||
      role === "owner" ||
      role === "admin";
    if (staffBtn) staffBtn.hidden = !showStaff;
    if (devBtn) {
      devBtn.hidden = !showDev;
      if (A.DEV_PORTAL_URL) devBtn.setAttribute("href", A.DEV_PORTAL_URL);
    }
    if (actionsEl) actionsEl.hidden = !(showStaff || showDev);

    paintRep(session.user);
    A.paintAvatarPair(avatar, fallback, session.user);
    document.title = `${A.displayName(session.user)} — Slifer`;
  }

  signInBtn?.addEventListener("click", () => {
    window.SliferAccount?.openOverlay("gate");
  });

  addEventListener("slifer:session", (e) => {
    paint(e.detail);
  });

  const session = A.loadSession();
  paint(session);
  if (session) {
    A.enrichSession(session.token, session.user).then((user) => {
      paint(A.loadSession() || { token: session.token, user });
    });
  }
})();
