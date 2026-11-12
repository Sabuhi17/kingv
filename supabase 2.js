// Yalnız public anon açarı. Service role açarını HEÇ VAXT bura yazmayın.
const SUPABASE_URL='https://YOUR-PROJECT.supabase.co';
const SUPABASE_ANON_KEY='YOUR-ANON-PUBLIC-KEY';
// sessionStorage: hər brauzer tabı ayrı oyunçu sayılır (eyni brauzerdə 2 tab ilə test etmək üçün)
const sb=supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{auth:{storage:window.sessionStorage}});
