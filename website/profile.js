(() => {
  const A = window.SliferAuth;
  if (!A) return;

  const loading = document.getElementById("profile-loading");
  const body = document.getElementById("profile-body");
  const empty = document.getElementById("profile-empty");
  const avatar = document.getElementById("profile-avatar");
  const fallback = document.getElementById("profile-fallback");
  const nameEl = document.getElementById("profile-name");
  const statusEl = document.getElementById("profile-status");
  const repEl = document.getElementById("profile-rep");
  const signInBtn = document.getElementById("profile-signin");

  function paint(session) {
    if (loading) loading.hidden = true;
    if (!session?.user) {
      if (body) body.hidden = true;
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;
    if (body) body.hidden = false;
    if (nameEl) nameEl.textContent = A.displayName(session.user);
    if (statusEl) statusEl.textContent = A.formatStatus(session.user);
    if (repEl) repEl.textContent = "Rep — coming soon";
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
