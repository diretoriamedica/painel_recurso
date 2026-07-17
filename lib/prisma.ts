import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const logLevels: ('error' | 'warn')[] =
  process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'];

async function createPrisma(): Promise<PrismaClient> {
  const instance = process.env.CLOUD_SQL_INSTANCE;
  const saKey = process.env.GCP_SA_KEY;
  // Durante o `next build` não inicializamos o connector (evita chamar o GCP em tempo de build).
  const isBuild = process.env.NEXT_PHASE === 'phase-production-build';

  // Runtime (Vercel): Cloud SQL via connector + service account (mTLS, sem IP público autorizado).
  if (!isBuild && instance && saKey) {
    const [{ Connector, IpAddressTypes }, { GoogleAuth }, { PrismaPg }] =
      await Promise.all([
        import('@google-cloud/cloud-sql-connector'),
        import('google-auth-library'),
        import('@prisma/adapter-pg'),
      ]);

    const auth = new GoogleAuth({
      credentials: JSON.parse(saKey),
      scopes: ['https://www.googleapis.com/auth/sqlservice.admin'],
    });
    const connector = new Connector({ auth });
    const opts = await connector.getOptions({
      instanceConnectionName: instance,
      ipType: IpAddressTypes.PUBLIC,
    });

    const adapter = new PrismaPg({
      ...opts,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE,
      max: 3,
      statement_timeout: 290_000,
    });

    return new PrismaClient({ adapter, log: logLevels });
  }

  // Local/CLI: conexão direta via DATABASE_URL (ex.: Cloud SQL Auth Proxy).
  return new PrismaClient({ log: logLevels });
}

export const prisma = globalForPrisma.prisma ?? (await createPrisma());

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
