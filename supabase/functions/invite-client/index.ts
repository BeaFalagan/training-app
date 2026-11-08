// Alta de clientes con código de acceso.
//
// - { email, full_name }                  → crea el cliente vinculado al entrenador
// - { action: 'reset', client_id }         → genera un código nuevo para un cliente existente
//
// Devuelve { id, code }. El código es una contraseña temporal: el cliente entra
// con su email + código y la app le obliga a crear su propia contraseña.
// No envía emails, así que funciona sin SMTP propio.
import { admin, getCaller } from '../_shared/clients.ts';
import { corsHeaders, json } from '../_shared/cors.ts';

// Sin caracteres ambiguos (0/O, 1/I/L) para que se pueda dictar o copiar sin errores
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateCode(length = 8): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const caller = await getCaller(req);
  if (!caller || caller.role !== 'trainer') return json({ error: 'Solo entrenadores' }, 403);

  const body = await req.json().catch(() => ({}));
  const code = generateCode();

  // Nuevo código para un cliente existente
  if (body.action === 'reset') {
    const { data: client } = await admin.from('profiles').select('id, trainer_id').eq('id', body.client_id).single();
    if (!client || client.trainer_id !== caller.id) return json({ error: 'Cliente no encontrado' }, 404);

    const { error } = await admin.auth.admin.updateUserById(client.id, { password: code });
    if (error) return json({ error: error.message }, 400);
    await admin.from('profiles').update({ must_change_password: true }).eq('id', client.id);
    return json({ id: client.id, code });
  }

  // Alta de cliente nuevo
  // Solo guardamos nombre y email: la app no guarda más datos personales
  const { email, full_name } = body;
  const cleanEmail = String(email ?? '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) return json({ error: 'Email no válido' }, 400);

  const { data, error } = await admin.auth.admin.createUser({
    email: cleanEmail,
    password: code,
    email_confirm: true,
    user_metadata: { full_name: full_name ?? '' },
  });
  if (error) {
    const msg = /already been registered|already exists/i.test(error.message)
      ? 'Ya existe una cuenta con ese email'
      : error.message;
    return json({ error: msg }, 400);
  }

  const { error: profileError } = await admin.from('profiles').upsert({
    id: data.user.id,
    email: cleanEmail,
    full_name: full_name ?? '',
    role: 'client',
    trainer_id: caller.id,
    must_change_password: true,
  });
  if (profileError) {
    // No dejar un usuario huérfano sin perfil vinculado
    await admin.auth.admin.deleteUser(data.user.id);
    return json({ error: profileError.message }, 500);
  }

  return json({ id: data.user.id, code });
});
