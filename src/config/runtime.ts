export type RuntimeConfig = {
  studioMode: boolean
  modelId?: string // e.g., 'gemini-2.5-flash' | 'gemini-2.5-pro'
  temperature?: number
  maxTokens?: number
  supabaseUrl?: string
  supabaseAnonKey?: string
  squareAppId?: string
  squareLocationId?: string
  authGoogleClientId?: string
  authGoogleClientSecret?: string
  authEmailEnabled?: boolean
}

const LS_KEY = 'app.runtime.config'

function readEnv(): Partial<RuntimeConfig> {
  // Fix: Guard against import.meta.env being undefined in some environments.
  const e = (import.meta as any)?.env;
  if (!e) {
    // Return a default configuration when environment variables are not available.
    return { studioMode: false };
  }
  
  return {
    studioMode: e.VITE_STUDIO_MODE === '1',
    modelId: e.VITE_GEMINI_MODEL,
    temperature: e.VITE_TEMPERATURE ? parseFloat(e.VITE_TEMPERATURE) : undefined,
    maxTokens: e.VITE_MAX_TOKENS ? parseInt(e.VITE_MAX_TOKENS, 10) : undefined,
    supabaseUrl: e.VITE_SUPABASE_URL,
    supabaseAnonKey: e.VITE_SUPABASE_ANON_KEY,
    squareAppId: e.VITE_SQUARE_APP_ID,
    squareLocationId: e.VITE_SQUARE_LOCATION_ID,
    authGoogleClientId: e.VITE_AUTH_GOOGLE_CLIENT_ID,
    authGoogleClientSecret: e.VITE_AUTH_GOOGLE_CLIENT_SECRET,
    authEmailEnabled: e.VITE_AUTH_EMAIL_ENABLED === '1'
  }
}

export function loadConfig(): RuntimeConfig {
  const base = readEnv()
  try {
    const lsStored = localStorage.getItem(LS_KEY);
    const ls = lsStored ? JSON.parse(lsStored) : {};
    
    const merged = { ...base, ...ls };
    
    // Default model if not set
    if (!merged.modelId) {
      merged.modelId = 'gemini-2.5-flash';
    }
    
    // Studio mode is determined by the last explicit setting in localStorage,
    // otherwise it falls back to the environment variable.
    merged.studioMode = ls.studioMode !== undefined ? ls.studioMode : base.studioMode ?? false;

    return merged;

  } catch { 
    return { ...base, studioMode: base.studioMode ?? false, modelId: base.modelId ?? 'gemini-2.5-flash' } 
  }
}

export function saveConfig(next: Partial<RuntimeConfig>) {
  const current = loadConfig()
  const merged = { ...current, ...next }
  localStorage.setItem(LS_KEY, JSON.stringify(merged))
  return merged
}