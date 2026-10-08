/** Click feedback: a soft ring grows from the pointer on any .btn. Skipped when the user prefers reduced motion. */
export function installRipple() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  document.addEventListener("pointerdown", (e) => {
    const b = (e.target as HTMLElement | null)?.closest<HTMLElement>(".btn, .tab-press");
    if (!b || (b as HTMLButtonElement).disabled) return;
    const r = b.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 1.6;
    const s = document.createElement("span");
    s.className = "ripple";
    s.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
    b.appendChild(s);
    s.addEventListener("animationend", () => s.remove());
  });
}

/** A short burst of palette coloured chips from an element. Used when a task is ticked off. */
export function burst(el: Element) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const colors = ["#5ED6C3", "#0E7C7B", "#0B2E2D", "#C9E6DF"];
  for (let i = 0; i < 14; i++) {
    const s = document.createElement("span");
    s.className = "burst";
    s.style.left = `${cx}px`;
    s.style.top = `${cy}px`;
    s.style.background = colors[i % colors.length];
    document.body.appendChild(s);
    const a = (Math.PI * 2 * i) / 14 + Math.random() * 0.4;
    const d = 38 + Math.random() * 44;
    s.animate(
      [{ transform: "translate(-50%,-50%) scale(1)", opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d}px)) scale(0.2) rotate(${Math.random() * 240}deg)`, opacity: 0 }],
      { duration: 620 + Math.random() * 200, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
    ).finished.then(() => s.remove());
  }
}
