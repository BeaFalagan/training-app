import { createClient } from 'npm:@supabase/supabase-js@2';

const url = Deno.env.get('SUPABASE_URL')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/** Cliente con privilegios totales. Úsalo solo después de validar al usuario. */
export const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

/** Devuelve el perfil del usuario que llama (a partir de su JWT) o null. */
export async function getCaller(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;
  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return null;
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single();
  return profile as { id: string; role: 'trainer' | 'client'; full_name: string } | null;
}
