import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

function genPassword(len = 16): string {
  const chars =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
  const bytes = crypto.randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length];
  return out;
}

const ADMINS = [
  { name: 'Lucas Albuquerque', email: 'lucas.albuquerque@grupohospitalcasa.com.br' },
  { name: 'Pedro Ambrosio', email: 'pedro.ambrosio@grupohospitalcasa.com.br' },
];

// Prazos iniciais (ARQUITETURA.md §11.2)
const OPERADORAS: Array<[string, number]> = [
  ['BRADESCO', 60],
  ['GEAP', 30],
  ['PORTO SEGURO', 60],
  ['UNIMED FERJ', 30],
  ['AMIL', 90],
  ['CORREIOS', 60],
  ['CASSI', 30],
  ['SULAMERICA', 60],
  ['REAL GRANDEZA', 30],
  ['KLINI', 30],
  ['ELETROS', 30],
  ['OMINT', 60],
  ['MEDISERVICE', 60],
  ['PETROBRAS', 30],
  ['GOLDEN CROSS', 60],
  ['VALE', 30],
  ['ASSIM', 30],
  ['FAPES', 30],
  ['VIVEST', 30],
  ['CABERJ', 30],
];

async function main() {
  const novasSenhas: Array<{ email: string; password: string }> = [];

  for (const a of ADMINS) {
    const existing = await prisma.user.findUnique({ where: { email: a.email } });
    if (existing) {
      console.log(`• Admin já existe (senha mantida): ${a.email}`);
      continue;
    }
    const password = genPassword();
    const hash = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: {
        name: a.name,
        email: a.email,
        password: hash,
        isAdmin: true,
        canUpload: true,
        canEditPrazos: true,
        recebeNotificacoes: true,
        aprovado: true,
      },
    });
    novasSenhas.push({ email: a.email, password });
  }

  let novas = 0;
  for (const [nome, dias] of OPERADORAS) {
    const res = await prisma.prazoOperadora.upsert({
      where: { nomeOperadora: nome },
      update: {}, // idempotente: não sobrescreve prazo já ajustado
      create: { nomeOperadora: nome, prazoDias: dias },
    });
    if (res) novas++;
  }
  console.log(`• Operadoras garantidas: ${OPERADORAS.length}`);

  if (novasSenhas.length) {
    console.log('\n=================== SENHAS GERADAS ===================');
    console.log('Guarde com segurança e troque no primeiro acesso.\n');
    for (const s of novasSenhas) {
      console.log(`  ${s.email}`);
      console.log(`  senha: ${s.password}\n`);
    }
    console.log('=====================================================\n');
  } else {
    console.log('\nNenhum admin novo criado (todos já existiam).');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
