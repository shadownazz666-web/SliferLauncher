export function Backdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]">
      <div className="liquid-sheen absolute inset-0" />
      <div className="absolute -left-28 top-6 h-80 w-80 rounded-full bg-crimson/25 blur-3xl" />
      <div className="absolute right-[-4rem] top-1/3 h-72 w-72 rounded-full bg-gold/15 blur-3xl" />
      <div className="absolute bottom-[-5rem] left-1/3 h-96 w-96 rounded-full bg-crimson/10 blur-3xl" />
    </div>
  );
}
