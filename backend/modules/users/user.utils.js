import crypto from "crypto";

const ADJECTIVES = [
  "Mystic", "Silent", "Cosmic", "Velvet", "Shadow", "Cyber", "Phantom", "Quantum",
  "Astral", "Wandering", "Radiant", "Electric", "Silver", "Echo", "Lunar", "Solar",
  "Nebula", "Glitch", "Crimson", "Zenith", "Static", "Enigma", "Opal", "Vortex"
];

const NOUNS = [
  "Falcon", "Fox", "Viper", "Panther", "Raven", "Wolf", "Nomad", "Phoenix",
  "Owl", "Otter", "Griffin", "Lynx", "Panda", "Hawk", "Tiger", "Dragon",
  "Cobra", "Specter", "Sparrow", "Jaguar", "Badger", "Chameleon", "Koala", "Kitsune"
];

export const AVATAR_PRESETS = [
  { id: "avatar_cosmic_fox", name: "Cosmic Fox", color: "#8b5cf6", icon: "Fox" },
  { id: "avatar_cyber_wolf", name: "Cyber Wolf", color: "#06b6d4", icon: "Wolf" },
  { id: "avatar_shadow_owl", name: "Shadow Owl", color: "#10b981", icon: "Owl" },
  { id: "avatar_phantom_cat", name: "Phantom Cat", color: "#f43f5e", icon: "Cat" },
  { id: "avatar_astral_bear", name: "Astral Bear", color: "#f59e0b", icon: "Bear" },
  { id: "avatar_lunar_hawk", name: "Lunar Hawk", color: "#3b82f6", icon: "Bird" },
  { id: "avatar_mystic_deer", name: "Mystic Deer", color: "#ec4899", icon: "Compass" },
  { id: "avatar_zenith_lion", name: "Zenith Lion", color: "#eab308", icon: "Sun" }
];

export const AVAILABLE_INTERESTS = [
  "Life Thoughts",
  "Hot Takes",
  "Confessions",
  "Tech & AI",
  "Relationships",
  "Work & Career",
  "Mental Health",
  "Late Night Vibe",
  "Philosophy",
  "College & Campus",
  "Gaming & Pop",
  "Unpopular Opinions"
];

/**
 * Generate a unique and catchy anonymous username.
 * e.g., "SilentFalcon73"
 */
export const generateAnonymousUsername = () => {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(10 + Math.random() * 90); // 2-digit number (10-99)
  return `${adj}${noun}${num}`;
};

/**
 * Select a random initial avatar
 */
export const getRandomAvatar = () => {
  const selected = AVATAR_PRESETS[Math.floor(Math.random() * AVATAR_PRESETS.length)];
  return selected.id;
};
