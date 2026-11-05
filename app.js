
"use strict";

// CYBER THREAT RIVER
// Five synchronised browser displays

const SCREEN_COUNT = 5;
const params = new URLSearchParams(window.location.search);

const SCREEN = Math.max(
  1,
  Math.min(5, Number(params.get("screen")) || 1)
);

const canvas = document.getElementById("threatCanvas");
const ctx = canvas.getContext("2d");

const statusEl = document.getElementById("status");
const screenEl = document.getElementById("screenNumber");
const countEl = document.getElementById("threatCount");
const updatedEl = document.getElementById("lastUpdated");
const tooltip = document.getElementById("tooltip");

let width = 0;
let height = 0;
let particles = [];
let lastUpdated = null;
let dataMode = "DEMONSTRATION";

// Time for a particle to cross all five screens
const TRAVEL_TIME = 120000; // 2 minutes

// Deterministic pseudo-random generator.
// All screens produce the same positions.
function random(seed) {
  let x = Math.sin(seed * 127.1 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// Example vulnerabilities for initial testing
function demoThreats() {
  const now = Date.now();

  return Array.from({ length: 180 }, (_, i) => {
    const ageDays = random(i + 20) * 120;
    const severity = 2 + random(i + 40) * 8;

    return {
      id: `DEMO-${String(i + 1).padStart(4, "0")}`,
      description: "Demonstration cybersecurity vulnerability",
      published: new Date(
        now - ageDays * 86400000
      ).toISOString(),
      severity: severity,
      exploited: random(i + 60) > 0.88,
      epss: random(i + 80),
      source: "DEMO"
    };
  });
}

// Normalise feed records
function normaliseThreat(t, i) {
  return {
    id: String(t.id || t.cve || `THREAT-${i}`),
    description: String(t.description || "No description"),
    published: t.published || t.date || new Date().toISOString(),
    severity: Number(t.severity ?? t.cvss ?? 5),
    exploited: Boolean(t.exploited),
    epss: Number(t.epss || 0),
    source: String(t.source || "FEED")
  };
}

// Determine colour by age
function threatColour(ageDays) {
  if (ageDays < 1) return "#38bdf8";   // Blue
  if (ageDays < 7) return "#22d3ee";   // Cyan
  if (ageDays < 30) return "#facc15";  // Yellow
  if (ageDays < 90) return "#fb923c";  // Orange
  return "#f87171";                    // Red
}

// Build particles from threat records
function createParticles(threats) {
  particles = threats.map((t, i) => {
    const seed = [...t.id].reduce(
      (sum, ch) => sum + ch.charCodeAt(0),
      0
    ) + i * 31;

    return {
      ...t,
      seed,
      lane: 0.08 + random(seed + 1) * 0.84,
      speed: 0.65 + random(seed + 2) * 0.7,
      phase: random(seed + 3) * Math.PI * 2,
      offset: random(seed + 4),
      drift: 0.01 + random(seed + 5) * 0.04
    };
  });

  countEl.textContent = `${particles.length} THREATS`;
}

// Resize canvas for sharp rendering
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  width = window.innerWidth;
  height = window.innerHeight;

  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener("resize", resize);

// Position a particle in the virtual five-screen space
function particlePosition(p, now) {
  const totalWidth = width * SCREEN_COUNT;

  const elapsed = now / TRAVEL_TIME;

  const progress = (
    p.offset + elapsed * p.speed
  ) % 1;

  const globalX = progress * totalWidth;

  const screenStart = (SCREEN - 1) * width;

  const x = globalX - screenStart;

  const y = height * (
    p.lane +
    Math.sin(elapsed * 5 + p.phase) * p.drift
  );

  return { x, y };
}

// Draw a single particle
function drawParticle(p, now) {
  const pos = particlePosition(p, now);

  const severity = Math.max(
    0,
    Math.min(10, p.severity)
  );

  const radius = 2.5 + severity * 1.2;

  // Skip objects outside this screen
  if (pos.x < -radius * 5 ||
      pos.x > width + radius * 5) {
    return;
  }

  const ageDays = Math.max(
    0,
    (now - new Date(p.published).getTime()) / 86400000
  );

  const colour = threatColour(ageDays);

  const pulse = p.exploited
    ? 1 + Math.sin(now / 350 + p.phase) * 0.25
    : 1;

  const r = radius * pulse;

  // Glow represents severity and exploitation probability
  const glowRadius = r * (2.5 + p.epss * 2);

  const glow = ctx.createRadialGradient(
    pos.x, pos.y, 0,
    pos.x, pos.y, glowRadius
  );

  glow.addColorStop(0, colour + "99");
  glow.addColorStop(0.3, colour + "33");
  glow.addColorStop(1, colour + "00");

  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(
    pos.x, pos.y, glowRadius,
    0, Math.PI * 2
  );
  ctx.fill();

  // Main particle
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
  ctx.fill();

  // Ring for confirmed exploited vulnerabilities
  if (p.exploited) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(
      pos.x, pos.y, r + 5,
      0, Math.PI * 2
    );
    ctx.stroke();
  }

  // Labels for larger particles
  if (severity >= 8.5) {
    ctx.font = "11px Arial";
    ctx.fillStyle = "#cbd5e1";
    ctx.textAlign = "center";
    ctx.fillText(
      p.id,
      pos.x,
      pos.y + r + 18
    );
  }
}

// Background grid
function drawBackground() {
  ctx.fillStyle = "#050d18";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(56,189,248,0.045)";
  ctx.lineWidth = 1;

  const gridSize = 80;

  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

// Animation loop
function animate() {
  const now = Date.now();

  drawBackground();

  for (const particle of particles) {
    drawParticle(particle, now);
  }

  requestAnimationFrame(animate);
}

// Mouse hover details
canvas.addEventListener("mousemove", event => {
  const now = Date.now();

  let closest = null;
  let distance = 30;

  for (const p of particles) {
    const pos = particlePosition(p, now);

    const d = Math.hypot(
      pos.x - event.clientX,
      pos.y - event.clientY
    );

    if (d < distance) {
      distance = d;
      closest = p;
    }
  }

  if (!closest) {
    tooltip.style.display = "none";
    return;
  }

  const age = Math.floor(
    (now - new Date(closest.published).getTime()) /
    86400000
  );

  // Use textContent to avoid injecting feed HTML
  tooltip.replaceChildren();

  const details = [
    closest.id,
    closest.description.slice(0, 180),
    `Age: ${age} days`,
    `CVSS: ${closest.severity.toFixed(1)}`,
    `EPSS: ${(closest.epss * 100).toFixed(1)}%`,
    `Known exploited: ${closest.exploited ? "YES" : "NO"}`
  ];

  for (const line of details) {
    const div = document.createElement("div");
    div.textContent = line;
    tooltip.appendChild(div);
  }

  tooltip.style.display = "block";
  tooltip.style.left = Math.min(
    event.clientX + 18,
    width - 330
  ) + "px";

  tooltip.style.top = Math.min(
    event.clientY + 18,
    height - 170
  ) + "px";
});

canvas.addEventListener("mouseleave", () => {
  tooltip.style.display = "none";
});

// Load threat data
async function loadThreats() {
  try {
    const response = await fetch(
      "data/threats.json?t=" + Date.now(),
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error("Feed unavailable");
    }

    const data = await response.json();

    const records = Array.isArray(data)
      ? data
      : data.threats;

    if (!Array.isArray(records) || records.length === 0) {
      throw new Error("No threats in feed");
    }

    createParticles(records.map(normaliseThreat));

    dataMode = "LIVE DATA";
    lastUpdated = data.updated || new Date().toISOString();

  } catch (error) {
    // Keep existing live data if refresh fails
    if (dataMode !== "LIVE DATA") {
      createParticles(demoThreats());
      dataMode = "DEMONSTRATION";
    }
  }

  statusEl.textContent =
    `${dataMode} • PARTICLE VISUALISATION`;

  updatedEl.textContent = lastUpdated
    ? `UPDATED ${new Date(lastUpdated).toLocaleString()}`
    : "SIMULATED DATA";
}

// Start
resize();

screenEl.textContent =
  `SCREEN ${SCREEN} / ${SCREEN_COUNT}`;

loadThreats();
animate();

// Refresh the feed every five minutes
setInterval(loadThreats, 300000);
