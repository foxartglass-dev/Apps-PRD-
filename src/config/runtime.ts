export type RuntimeConfig = {
  studioMode: boolean
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
    
    // In non-studio mode, env vars take precedence.
    if (!base.studioMode && !ls.studioMode) {
        return { ...ls, ...base, studioMode: false };
    }
    // In studio mode, ls settings override env vars.
    return { ...base, ...ls, studioMode: true };

  } catch { 
    return { ...base, studioMode: base.studioMode ?? false } 
  }
}

export function saveConfig(next: Partial<RuntimeConfig>) {
  const current = loadConfig()
  const merged = { ...current, ...next }
  localStorage.setItem(LS_KEY, JSON.stringify(merged))
  return merged
}
