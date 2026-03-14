import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://asnmmjkowkcyvdujxlpm.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzbm1tamtvd2tjeXZkdWp4bHBtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0ODIzNDMsImV4cCI6MjA4OTA1ODM0M30.glfbOzKSDegqeVFwDnN_UueKV-Ur2akeAQn0PvnNxuI'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
