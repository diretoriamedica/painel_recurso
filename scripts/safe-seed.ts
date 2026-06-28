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

// Prazos oficiais do painel original (operadora -> dias)
const OPERADORAS: Array<[string, number]> = [
  ['AMAFRERJ', 30],
  ['AMIL', 90],
  ['ASSEFAZ', 60],
  ['ASSIM', 60],
  ['BRADESCO', 90],
  ['CABERJ', 30],
  ['CABERJ INTEGRAL', 30],
  ['CAMARJ', 30],
  ['CAMPERJ', 60],
  ['CAPESESP', 30],
  ['CARE PLUS', 30],
  ['CASSI', 90],
  ['CAURJ', 90],
  ['CORREIOS', 60],
  ['ELETROS', 60],
  ['ELETROS SAUDE', 60],
  ['FAPES', 30],
  ['FIO SAUDE', 30],
  ['GAMA SAÚDE', 60],
  ['GEAP', 60],
  ['GLOBAL SAÚDE', 30],
  ['GOLDEN CROSS', 60],
  ['KLINI', 60],
  ['LEVE SAÚDE', 30],
  ['LIFE', 30],
  ['MEDISERVICE', 60],
  ['MEDSENIOR', 60],
  ['OMINT', 60],
  ['OPLAN', 30],
  ['PETROBRAS', 60],
  ['PORTO SEGURO', 35],
  ['POSTAL SAUDE', 60],
  ['PREVENT SENIOR', 30],
  ['REAL GRANDEZA', 60],
  ['SAMOC', 30],
  ['SAUDE CAIXA', 60],
  ['SILVESTRE SAUDE', 60],
  ['SULAMERICA', 90],
  ['UNIMED COSTA VERDE RJ', 60],
  ['UNIMED FERJ', 30],
  ['UNIMED PAC', 30],
  ['UNIMED SEGUROS', 60],
  ['UNIMEDCNU', 45],
  ['VALE', 60],
  ['VIVEST', 30],
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
