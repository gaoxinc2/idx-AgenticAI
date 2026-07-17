import type { ListingRow } from "../db/activeListings";

export interface UserSession {
  city?: string;
  maxPrice?: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  type?: string;
  pool?: "True";
  hasView?: "True";
  maxHoa?: number;

  lastResults?: ListingRow[];
  conversationStep: number;
}

const sessions = new Map<string, UserSession>();

export function getSession(userId: string): UserSession {
  if (!sessions.has(userId)) {
    sessions.set(userId, {
      conversationStep: 0,
    });
  }

  return sessions.get(userId)!;
}

export function updateSession(
  userId: string,
  updates: Partial<UserSession>
): UserSession {
  const currentSession = getSession(userId);

  const updatedSession: UserSession = {
    ...currentSession,
    ...updates,
  };

  sessions.set(userId, updatedSession);

  return updatedSession;
}

export function clearSession(userId: string): void {
  sessions.delete(userId);
}

export function getAllSessions(): Map<string, UserSession> {
  return sessions;
}