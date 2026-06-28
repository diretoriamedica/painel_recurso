import { Header } from '@/app/components/header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F2F2F2]">
      <Header />
      <main className="max-w-[1600px] mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
