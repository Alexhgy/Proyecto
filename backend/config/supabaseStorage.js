const { createClient } = require("@supabase/supabase-js");

const supabaseStorage = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  },
);

module.exports = supabaseStorage;
