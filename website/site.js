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
})();
