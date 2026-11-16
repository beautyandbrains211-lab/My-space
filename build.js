// Netlify build: writes public Supabase URL + anon key (safe for frontend) into config.js
import {writeFileSync} from 'fs';
const {SUPABASE_URL:url,SUPABASE_ANON_KEY:key}=process.env;
if(!url||!key){console.error('Set SUPABASE_URL and SUPABASE_ANON_KEY');process.exit(1)}
writeFileSync('config.js',`export const CONFIG=${JSON.stringify({url,key})};`);
