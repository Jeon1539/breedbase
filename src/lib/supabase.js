import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ymoxrmmkmusmufpnjozs.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inltb3hybW1rbXVzbXVmcG5qb3pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1Mjk2MzEsImV4cCI6MjA5NDEwNTYzMX0.ROHmFiuTzR3iAFbnKQGUv0QJqvfTUutZI0vuC5JENQM'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
