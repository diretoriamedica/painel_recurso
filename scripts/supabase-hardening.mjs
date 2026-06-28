// Endurecimento de segurança no Supabase (resolve os 2 warnings + hardening de grants).
// Executa como role `postgres` via Prisma. Idempotente.
import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();

async function main() {
  // 1) Revogar EXECUTE da função SECURITY DEFINER public.rls_auto_enable() dos papéis públicos.
  const fns = await p.$queryRawUnsafe(
    "select p.proname, pg_get_function_identity_arguments(p.oid) as args from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='rls_auto_enable'",
  );
  console.log('Funções rls_auto_enable encontradas:', JSON.stringify(fns));
  for (const f of fns) {
    const sig = `public."${f.proname}"(${f.args})`;
    for (const role of ['PUBLIC', 'anon', 'authenticated']) {
      await p.$executeRawUnsafe(`REVOKE EXECUTE ON FUNCTION ${sig} FROM ${role};`);
    }
    console.log('  REVOKE EXECUTE ok em', sig);
  }

  // 2) Hardening: remover grants amplos das tabelas do app dos papéis anon/authenticated.
  //    O app só acessa via Prisma (role postgres); a API pública não precisa de acesso.
  for (const t of ['User', 'PrazoOperadora', 'ArquivoCarregado', 'CasoGlosa']) {
    for (const role of ['anon', 'authenticated']) {
      await p.$executeRawUnsafe(`REVOKE ALL ON TABLE public."${t}" FROM ${role};`);
    }
  }
  console.log('  REVOKE ALL nas 4 tabelas (anon, authenticated) ok');

  // 3) Verificação
  const g = await p.$queryRawUnsafe(
    "select grantee, table_name from information_schema.role_table_grants where table_schema='public' and grantee in ('anon','authenticated') and table_name in ('User','PrazoOperadora','ArquivoCarregado','CasoGlosa')",
  );
  console.log('Grants restantes (tabelas, anon/authenticated):', g.length);
  const fg = await p.$queryRawUnsafe(
    "select grantee from information_schema.routine_privileges where routine_schema='public' and routine_name='rls_auto_enable'",
  );
  console.log('EXECUTE restante na função (grantees):', JSON.stringify(fg));
}

main()
  .catch((e) => {
    console.error(String(e).slice(0, 400));
    process.exit(1);
  })
  .finally(() => p.$disconnect());
