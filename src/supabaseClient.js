import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
}

// Use sessionStorage instead of the default localStorage so that each browser
// tab maintains its own independent Supabase session. This lets you be logged
// in as different users (Tenant, Agent, SuperAdmin) in separate tabs without
// one tab's login overwriting another's.
const sessionStorageAdapter = {
  getItem: (key) => {
    try { return sessionStorage.getItem(key) } catch { return null }
  },
  setItem: (key, value) => {
    try { sessionStorage.setItem(key, value) } catch { /* ignore */ }
  },
  removeItem: (key) => {
    try { sessionStorage.removeItem(key) } catch { /* ignore */ }
  },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: sessionStorageAdapter,
    persistSession: true,
    autoRefreshToken: true,
  },
})
