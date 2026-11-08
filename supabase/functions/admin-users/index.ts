// Gestión de usuarios para administradores.
//
// Acciones (body JSON):
//  - { action: 'create', role: 'trainer'|'client', email, full_name, trainer_id? } → { id, code }
//  - { action: 'delete', user_id }                       → { ok }
//  - { action: 'set_trainer', client_id, trainer_id }    → { ok }
//  - { action: 'reset_code', user_id }                   → { id, code }
//
// Los usuarios nuevos reciben un código de acceso temporal (no se envían emails).
import { admin, getCaller } from '../_shared/clients.ts';
import { corsHeaders, json } from '../_shared/cors.ts';

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const generateCode = (length = 8) =>
  Array.from(crypto.getRandomValues(new Uint8Array(length)), (b) => ALPHABET[b % ALPHABET.length]).join('');

type Profile = { id: string; role: 'trainer' | 'client'; trainer_id: string | null; is_admin: boolean };

async function getProfile(id: string): Promise<Profile | null> {
  const { data } = await admin.from('profiles').select('id, role, trainer_id, is_admin').eq('id', id).single();
  return data as Profile | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const caller = (await getCaller(req)) as (Profile & { full_name: string }) | null;
  if (!caller?.is_admin) return json({ error: 'Solo administradores' }, 403);

  const body = await req.json().catch(() => ({}));

  switch (body.action) {
    case 'create': {
      const role = body.role === 'trainer' ? 'trainer' : 'client';
      const email = String(body.email ?? '').trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'Email no válido' }, 400);
      if (!String(body.full_name ?? '').trim()) return json({ error: 'Indica el nombre' }, 400);

      let trainerId: string | null = null;
      if (role === 'client') {
        const trainer = body.trainer_id ? await getProfile(body.trainer_id) : null;
        if (!trainer || trainer.role !== 'trainer') return json({ error: 'Elige un entrenador para el cliente' }, 400);
        trainerId = trainer.id;
      }

      const code = generateCode();
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: code,
        email_confirm: true,
        user_metadata: { full_name: body.full_name },
      });
      if (error) {
        const msg = /already been registered|already exists/i.test(error.message) ? 'Ya existe una cuenta con ese email' : error.message;
        return json({ error: msg }, 400);
      }

      const { error: profileError } = await admin.from('profiles').upsert({
        id: data.user.id,
        email,
        full_name: String(body.full_name).trim(),
        role,
        trainer_id: trainerId,
        must_change_password: true,
      });
      if (profileError) {
        await admin.auth.admin.deleteUser(data.user.id);
        return json({ error: profileError.message }, 500);
      }
      return json({ id: data.user.id, code });
    }

    case 'delete': {
      const target = await getProfile(body.user_id);
      if (!target) return json({ error: 'Usuario no encontrado' }, 404);
      if (target.id === caller.id) return json({ error: 'No puedes eliminar tu propia cuenta' }, 400);

      if (target.role === 'trainer') {
        const { count } = await admin.from('profiles').select('id', { count: 'exact', head: true }).eq('trainer_id', target.id);
        if (count) {
          return json({ error: `Este entrenador tiene ${count} ${count === 1 ? 'cliente' : 'clientes'}. Cámbialos de entrenador antes de eliminarlo.` }, 400);
        }
        // Sus ejercicios pasan al administrador para que la biblioteca compartida no pierda nada
        await admin.from('exercises').update({ trainer_id: caller.id }).eq('trainer_id', target.id);
      }

      const { error } = await admin.auth.admin.deleteUser(target.id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    case 'set_trainer': {
      const client = await getProfile(body.client_id);
      const trainer = await getProfile(body.trainer_id);
      if (!client || client.role !== 'client') return json({ error: 'Cliente no encontrado' }, 404);
      if (!trainer || trainer.role !== 'trainer') return json({ error: 'Entrenador no encontrado' }, 404);

      const { error } = await admin.from('profiles').update({ trainer_id: trainer.id }).eq('id', client.id);
      if (error) return json({ error: error.message }, 400);
      // Sus planes pasan al nuevo entrenador para que pueda verlos y editarlos
      await admin.from('weekly_plans').update({ trainer_id: trainer.id }).eq('client_id', client.id);
      return json({ ok: true });
    }

    case 'reset_code': {
      const target = await getProfile(body.user_id);
      if (!target) return json({ error: 'Usuario no encontrado' }, 404);
      if (target.id === caller.id) return json({ error: 'Cambia tu contraseña desde tu perfil' }, 400);
      const code = generateCode();
      const { error } = await admin.auth.admin.updateUserById(target.id, { password: code });
      if (error) return json({ error: error.message }, 400);
      await admin.from('profiles').update({ must_change_password: true }).eq('id', target.id);
      return json({ id: target.id, code });
    }

    default:
      return json({ error: 'Acción no válida' }, 400);
  }
});
