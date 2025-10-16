import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
	throw new Error('Supabase URL ou clé anonyme manquante. Vérifiez votre fichier .env.local');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);


