// Each browser gets its own random learner ID. Clearing browser data starts fresh.
const KEY = "thinkbig.learnerId";

function generateUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback for plain HTTP LAN origins (e.g. http://192.168.x.x:3001) where randomUUID is restricted.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function getLearnerId(): string {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = generateUuid();
    localStorage.setItem(KEY, id);
  }
  return id;
}
