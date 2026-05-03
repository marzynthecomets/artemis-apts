// Vercel serverless function: GET transit time from Google Directions API.
// Called by both the web app (relative /api/commute) and the Chrome extension
// (absolute https://artemis-apts.vercel.app/api/commute).

const ALLOWED_ORIGINS = [
  "https://artemis-apts.vercel.app",
  "http://localhost:5173",
];

function setCors(req, res) {
  const origin = req.headers.origin || "";
  // Allow extension (chrome-extension://...) and our app origins.
  if (origin.startsWith("chrome-extension://") || ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { origin, destination } = req.body || {};
  if (!origin || !destination) {
    return res.status(400).json({ error: "Missing origin or destination" });
  }

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return res.status(500).json({ error: "GOOGLE_MAPS_API_KEY not configured" });

  const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
  url.searchParams.set("origin", origin);
  url.searchParams.set("destination", destination);
  url.searchParams.set("mode", "transit");
  url.searchParams.set("key", key);

  try {
    const r = await fetch(url);
    const data = await r.json();
    if (data.status !== "OK") {
      return res.status(400).json({ error: data.status, message: data.error_message });
    }
    const seconds = data.routes?.[0]?.legs?.[0]?.duration?.value;
    if (typeof seconds !== "number") {
      return res.status(400).json({ error: "No route found" });
    }
    return res.status(200).json({ duration_minutes: Math.round(seconds / 60) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
