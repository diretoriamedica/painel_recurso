'use client';

import { useEffect, useRef, useState } from 'react';
import { formatBRL, formatNumber } from '@/lib/formatters';
import { AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';

function useCountUp(target: number, duration = 700) {
  const [value, setValue] = useState(0);
  const ref = useRef<number>(0);
  useEffect(() => {
    const start = ref.current;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = start + (target - start) * eased;
      setValue(v);
      if (p < 1) raf = requestAnimationFrame(tick);
      else ref.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

export function KpiCard({
  title,
  valor,
  count,
  variant,
}: {
  title: string;
  valor: number;
  count: number;
  variant: 'vencido' | 'semana' | 'futuro';
}) {
  const v = useCountUp(valor);
  const c = useCountUp(count);

  const styles = {
    vencido: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', Icon: AlertTriangle, iconColor: 'text-red-600' },
    semana: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', Icon: Clock, iconColor: 'text-yellow-600' },
    futuro: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', Icon: CheckCircle2, iconColor: 'text-green-600' },
  }[variant];
  const Icon = styles.Icon;

  return (
    <div className={`rounded-xl shadow-md border ${styles.bg} ${styles.border} p-5`}>
      <div className="flex items-center gap-2 text-sm font-medium text-[#444444]">
        <Icon size={16} className={styles.iconColor} />
        {title}
      </div>
      <div className={`text-2xl font-bold mt-2 ${styles.text}`}>
        {formatBRL(v)}
      </div>
      <div className="text-sm text-[#444444] mt-1">
        {formatNumber(Math.round(c))} caso(s)
      </div>
    </div>
  );
}
