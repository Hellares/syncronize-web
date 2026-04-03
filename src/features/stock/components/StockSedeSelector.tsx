'use client';

import { useEmpresa } from '@/features/empresa/context/empresa-context';

interface Props {
  value: string | null;
  onChange: (sedeId: string) => void;
}

export default function StockSedeSelector({ value, onChange }: Props) {
  const { sedes } = useEmpresa();
  const activeSedes = sedes.filter(s => s.isActive);

  return (
    <div className="flex items-center gap-3">
      <label className="text-sm font-medium text-gray-700">Sede:</label>
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#437EFF]"
      >
        {activeSedes.map(s => (
          <option key={s.id} value={s.id}>
            {s.nombre}{s.esPrincipal ? ' (Principal)' : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
