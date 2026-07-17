/**
 * Reset de senha de um usuário do Painel Recurso.
 *
 * Uso (a senha NUNCA é passada como argumento — vai por variável de ambiente,
 * e o ideal é prefixar o comando com um espaço para não ficar no histórico):
 *
 *    RESET_EMAIL='seu.email@grupohospitalcasa.com.br' \
 *    RESET_PASSWORD='suaSenhaNova' \
 *    npx tsx scripts/reset-password.ts
 *
 * Se RESET_EMAIL não for informado, usa o admin padrão (Lucas).
 * O hash usa bcrypt cost 12 (mesmo do seed) e garante aprovado=true.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEFAULT_EMAIL = 'lucas.albuquerque@grupohospitalcasa.com.br';

async function main() {
  const email = (process.env.RESET_EMAIL || DEFAULT_EMAIL).trim().toLowerCase();
  const password = process.env.RESET_PASSWORD;

  if (!password || password.length < 8) {
    console.error(
      '✗ Defina RESET_PASSWORD (mínimo 8 caracteres) como variável de ambiente.'
    );
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`✗ Usuário não encontrado: ${email}`);
    console.error('  Verifique o e-mail (RESET_EMAIL) ou rode o seed primeiro.');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);
  await prisma.user.update({
    where: { email },
    data: { password: hash, aprovado: true },
  });

  console.log(`✓ Senha redefinida para: ${email}`);
  console.log('  Faça login com a nova senha. (Não guarde a senha em texto.)');
}

main()
  .catch((e) => {
    console.error('✗ Erro ao redefinir senha:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
