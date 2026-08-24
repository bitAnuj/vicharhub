const STORAGE_KEY = "vicharhub-collab-user";

export type CollabUser = {
  id: string;
  name: string;
  color: string;
};

const COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFBE0B", "#FB5607",
  "#8338EC", "#3A86FF", "#06D6A0", "#118AB2", "#EF476F",
];

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

function generateName(): string {
  const adjectives = ["Swift", "Clever", "Bright", "Calm", "Bold", "Keen", "Wise", "Cool"];
  const nouns = ["Fox", "Owl", "Bear", "Wolf", "Hawk", "Lynx", "Deer", "Seal"];
  return `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
}

export function getOrCreateCollabUser(): CollabUser {
  if (typeof window === "undefined") {
    return { id: generateId(), name: generateName(), color: COLORS[0] };
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // fall through to create new
    }
  }

  const user: CollabUser = {
    id: generateId(),
    name: generateName(),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  return user;
}

export function updateCollabUserName(name: string): CollabUser {
  const current = getOrCreateCollabUser();
  const updated = { ...current, name };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}
