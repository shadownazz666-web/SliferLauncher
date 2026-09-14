import { useEffect } from "react";
import "./UpdatingScreen.css";

/** Full-screen updating mark — text is only "UPDATING..." */
export function UpdatingScreen() {
  useEffect(() => {
    document.documentElement.classList.add("updating-active");
    return () => document.documentElement.classList.remove("updating-active");
  }, []);

  return (
    <div className="updating-stage" role="status" aria-live="polite" aria-label="Updating">
      <svg className="updating-mark" viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#D8A24A" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#D8A24A" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="shardGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#D8A24A" />
            <stop offset="100%" stopColor="#F3CD82" />
          </linearGradient>
          <linearGradient id="sheenGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F3CD82" stopOpacity="0" />
            <stop offset="50%" stopColor="#F3CD82" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#F3CD82" stopOpacity="0" />
          </linearGradient>
          <clipPath id="gemClip">
            <polygon points="100,40 160.6,75 160.6,145 100,180 39.4,145 39.4,75" />
            <polygon points="82,42 100,6 118,42" />
          </clipPath>
        </defs>
        <circle className="updating-glow" cx="100" cy="110" r="80" fill="url(#glowGrad)" />
        <g className="updating-ring">
          <circle
            className="updating-ring-arc"
            cx="100"
            cy="110"
            r="92"
            strokeDasharray="260 318"
            strokeDashoffset="0"
          />
        </g>
        <g className="updating-gem">
          <polygon className="updating-facet updating-facet-a" points="100,110 100,40 160.6,75" />
          <polygon className="updating-facet updating-facet-b" points="100,110 160.6,75 160.6,145" />
          <polygon className="updating-facet updating-facet-a" points="100,110 160.6,145 100,180" />
          <polygon className="updating-facet updating-facet-b" points="100,110 100,180 39.4,145" />
          <polygon className="updating-facet updating-facet-a" points="100,110 39.4,145 39.4,75" />
          <polygon className="updating-facet updating-facet-b" points="100,110 39.4,75 100,40" />
          <polygon
            className="updating-hex"
            points="100,40 160.6,75 160.6,145 100,180 39.4,145 39.4,75"
          />
          <polygon className="updating-shard" points="82,42 100,6 118,42" fill="url(#shardGrad)" />
          <g clipPath="url(#gemClip)">
            <rect className="updating-sheen" x="-20" y="-10" width="50" height="220" fill="url(#sheenGrad)" />
          </g>
        </g>
      </svg>
      <div className="updating-label">
        <span>UPDATING</span>
        <span className="updating-dot">.</span>
        <span className="updating-dot">.</span>
        <span className="updating-dot">.</span>
      </div>
    </div>
  );
}
