import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Bot,
  Clock3,
  Coins,
  Database,
  FileJson,
  Gauge,
  RefreshCw,
  Search,
  ShieldAlert,
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import {
  ObservabilityApiError,
  fetchGenerationDetail,
  fetchGenerations,
  fetchObservabilitySummary,
  type DailyMetric,
  type GenerationDetail,
  type GenerationSummary,
  type ObservabilitySummary,
} from '../services/observabilityApi';

const PAGE_SIZE = 25;

function formatNumber(value: number): string {
  return new Intl.NumberFormat('es', { notation: value >= 1_000_000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value);
}

function formatDuration(ms: number): string {
  return ms >= 1_000 ? `${(ms / 1_000).toFixed(2)} s` : `${Math.round(ms)} ms`;
}

function formatCost(value: number | null): string {
  return value == null ? 'Sin tarifa' : `USD ${value.toFixed(value < 0.01 ? 6 : 2)}`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function routeGenerationId(): string | null {
  return new URLSearchParams(window.location.search).get('generation');
}

export function ObservabilityAdminApp() {
  const [generationId, setGenerationId] = useState(routeGenerationId);

  useEffect(() => {
    const handlePopState = () => setGenerationId(routeGenerationId());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const openGeneration = useCallback((id: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('generation', id);
    window.history.pushState({}, '', url);
    setGenerationId(id);
  }, []);

  const closeGeneration = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete('generation');
    window.history.pushState({}, '', url);
    setGenerationId(null);
  }, []);

  return (
    <div className="min-h-dvh bg-[#f8faf1] text-[#191c17]">
      <header className="sticky top-0 z-30 border-b border-[#dfe3d9] bg-[#f8faf1]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between px-4 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#226046] text-white">
              <Activity size={20} />
            </div>
            <div>
              <p className="font-heading text-lg font-bold text-[#226046]">NutriKal Diagnostics</p>
              <p className="text-xs text-[#707a6c]">Observabilidad de generaciones</p>
            </div>
          </div>
          <a href="/" className="text-sm font-semibold text-[#226046] hover:underline">
            Volver a NutriKal
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-[1480px] px-4 py-6 md:px-8 md:py-10">
        {generationId
          ? <GenerationInspector id={generationId} onBack={closeGeneration} />
          : <ObservabilityDashboard onOpenGeneration={openGeneration} />}
      </main>
    </div>
  );
}

function ObservabilityDashboard({ onOpenGeneration }: { onOpenGeneration: (id: string) => void }) {
  const [days, setDays] = useState(7);
  const [summary, setSummary] = useState<ObservabilitySummary | null>(null);
  const [generations, setGenerations] = useState<GenerationSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [status, setStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ObservabilityApiError | Error | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextSummary, page] = await Promise.all([
        fetchObservabilitySummary(days),
        fetchGenerations({ offset, limit: PAGE_SIZE, status, search }),
      ]);
      setSummary(nextSummary);
      setGenerations(page.generations);
      setTotal(page.total);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError : new Error(String(loadError)));
    } finally {
      setLoading(false);
    }
  }, [days, offset, search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error && error instanceof ObservabilityApiError && error.status === 403) {
    return <AccessDenied />;
  }

  const daily = aggregateDaily(summary?.daily ?? []);
  const modelTokens = aggregateBy(summary?.daily ?? [], 'model', 'totalTokens');
  const providerErrors = aggregateProviderErrors(summary?.daily ?? []);

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#707a6c]">Centro de diagnóstico</p>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-[#226046] md:text-4xl">
            Salud de las generaciones
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#40493d]">
            Rendimiento, costo, calidad y trazabilidad de cada plan generado.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {[1, 7, 30].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => { setDays(value); setOffset(0); }}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                days === value ? 'bg-[#226046] text-white' : 'bg-[#eef1e8] text-[#40493d]'
              }`}
            >
              {value === 1 ? 'Hoy' : `${value} días`}
            </button>
          ))}
          <button
            type="button"
            onClick={() => void load()}
            className="ml-1 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#226046] shadow-sm"
            aria-label="Actualizar"
          >
            <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">
          {error.message}
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Kpi icon={<Gauge size={18} />} label="Requests" value={formatNumber(summary?.totals.requests ?? 0)} />
        <Kpi icon={<Clock3 size={18} />} label="Tiempo promedio" value={formatDuration(summary?.totals.averageDurationMs ?? 0)} />
        <Kpi icon={<Coins size={18} />} label="Costo" value={formatCost(summary?.totals.totalCostUsd ?? 0)} />
        <Kpi icon={<Bot size={18} />} label="Tokens" value={formatNumber(summary?.totals.totalTokens ?? 0)} />
        <Kpi icon={<AlertTriangle size={18} />} label="Errores" value={formatPercent(summary?.totals.errorRate ?? 0)} tone="danger" />
        <Kpi icon={<FileJson size={18} />} label="JSON inválidos" value={formatPercent(summary?.totals.invalidJsonRate ?? 0)} tone="warning" />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Tiempo promedio" subtitle="Latencia total por día">
          <LineChart points={daily.map((item) => item.averageDurationMs)} labels={daily.map((item) => item.day)} formatter={formatDuration} />
        </ChartCard>
        <ChartCard title="Costo diario" subtitle="Costo estimado de todos los intentos">
          <LineChart points={daily.map((item) => item.totalCostUsd)} labels={daily.map((item) => item.day)} formatter={(value) => `$${value.toFixed(3)}`} color="#a05d22" />
        </ChartCard>
        <ChartCard title="Tokens por modelo" subtitle="Uso acumulado en el período">
          <HorizontalBars values={modelTokens} formatter={formatNumber} />
        </ChartCard>
        <ChartCard title="Errores por proveedor" subtitle="Generaciones fallidas">
          <HorizontalBars values={providerErrors} formatter={(value) => `${value.toFixed(1)}%`} danger />
        </ChartCard>
      </section>

      <section className="overflow-hidden rounded-[1.75rem] bg-white shadow-[0_16px_50px_rgba(25,28,23,0.06)]">
        <div className="flex flex-col gap-4 border-b border-[#e4e7df] p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-heading text-xl font-bold text-[#226046]">Generaciones</h2>
            <p className="text-xs text-[#707a6c]">{formatNumber(total)} resultados</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setOffset(0);
                setSearch(searchInput.trim());
              }}
              className="relative"
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#707a6c]" size={16} />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="ID de request, generación o usuario"
                className="h-11 w-full rounded-2xl bg-[#f3f5eb] pl-10 pr-4 text-sm outline-none ring-[#226046]/20 focus:ring-2 sm:w-80"
              />
            </form>
            <select
              value={status}
              onChange={(event) => { setStatus(event.target.value); setOffset(0); }}
              className="h-11 rounded-2xl border-0 bg-[#f3f5eb] px-4 text-sm text-[#40493d] outline-none"
            >
              <option value="">Todos</option>
              <option value="completed">Completados</option>
              <option value="failed">Fallidos</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-[#f8faf1] text-[11px] uppercase tracking-wider text-[#707a6c]">
              <tr>
                <th className="px-5 py-3">Generación</th>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Modelo</th>
                <th className="px-4 py-3">Tiempo</th>
                <th className="px-4 py-3">Tokens</th>
                <th className="px-4 py-3">Costo</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf0e9]">
              {generations.map((generation) => (
                <tr
                  key={generation.id}
                  onClick={() => onOpenGeneration(generation.id)}
                  className="cursor-pointer transition hover:bg-[#f8faf1]"
                >
                  <td className="px-5 py-4">
                    <p className="font-mono text-xs font-semibold text-[#226046]">{generation.id.slice(0, 12)}…</p>
                    <p className="mt-1 text-xs text-[#707a6c]">{formatDate(generation.startedAt)}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-medium">{generation.user?.displayName ?? generation.userId.slice(0, 8)}</p>
                    <p className="text-xs text-[#707a6c]">{generation.user?.email ?? 'Sin detalle'}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-medium">{generation.model}</p>
                    <p className="text-xs capitalize text-[#707a6c]">{generation.provider}</p>
                  </td>
                  <td className="px-4 py-4 font-mono text-xs">{formatDuration(generation.totalDurationMs)}</td>
                  <td className="px-4 py-4 font-mono text-xs">{formatNumber(generation.totalTokens)}</td>
                  <td className="px-4 py-4 font-mono text-xs">{formatCost(generation.totalCostUsd)}</td>
                  <td className="px-4 py-4">
                    <Badge variant={generation.status === 'completed' ? 'success' : 'danger'}>
                      {generation.status === 'completed' ? 'Completado' : 'Fallido'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && generations.length === 0 && (
            <div className="p-12 text-center text-sm text-[#707a6c]">No hay generaciones para estos filtros.</div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[#e4e7df] p-4">
          <span className="text-xs text-[#707a6c]">
            {total === 0 ? 0 : offset + 1}–{Math.min(total, offset + PAGE_SIZE)} de {total}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
              Anterior
            </Button>
            <Button size="sm" variant="secondary" disabled={offset + PAGE_SIZE >= total} onClick={() => setOffset(offset + PAGE_SIZE)}>
              Siguiente
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function AccessDenied() {
  return (
    <div className="mx-auto mt-20 max-w-lg rounded-[2rem] bg-white p-10 text-center shadow-xl">
      <ShieldAlert className="mx-auto text-red-500" size={42} />
      <h1 className="mt-5 font-heading text-2xl font-bold">Acceso restringido</h1>
      <p className="mt-3 text-sm text-[#707a6c]">
        Tu cuenta no está incluida en la lista de administradores de observabilidad.
      </p>
      <a href="/" className="mt-6 inline-block font-semibold text-[#226046] hover:underline">Volver a NutriKal</a>
    </div>
  );
}

function Kpi({ icon, label, value, tone = 'default' }: {
  icon: ReactNode;
  label: string;
  value: string;
  tone?: 'default' | 'warning' | 'danger';
}) {
  const colors = tone === 'danger'
    ? 'bg-red-50 text-red-700'
    : tone === 'warning'
      ? 'bg-amber-50 text-amber-800'
      : 'bg-white text-[#226046]';
  return (
    <div className={`rounded-3xl p-4 shadow-[0_12px_35px_rgba(25,28,23,0.05)] ${colors}`}>
      <div className="flex items-center gap-2 text-xs font-semibold opacity-75">{icon}{label}</div>
      <p className="mt-3 font-mono text-xl font-bold md:text-2xl">{value}</p>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <article className="rounded-[1.75rem] bg-white p-5 shadow-[0_16px_50px_rgba(25,28,23,0.05)]">
      <h2 className="font-heading text-lg font-bold text-[#226046]">{title}</h2>
      <p className="text-xs text-[#707a6c]">{subtitle}</p>
      <div className="mt-5 h-52">{children}</div>
    </article>
  );
}

function LineChart({ points, labels, formatter, color = '#226046' }: {
  points: number[];
  labels: string[];
  formatter: (value: number) => string;
  color?: string;
}) {
  if (points.length === 0) return <EmptyChart />;
  const max = Math.max(...points, 1);
  const coords = points.map((point, index) => {
    const x = points.length === 1 ? 50 : (index / (points.length - 1)) * 100;
    const y = 88 - (point / max) * 72;
    return `${x},${y}`;
  }).join(' ');
  return (
    <div className="relative h-full">
      <span className="absolute right-0 top-0 font-mono text-xs text-[#707a6c]">{formatter(max)}</span>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-[85%] w-full overflow-visible">
        <defs>
          <linearGradient id={`fill-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="0" y1="88" x2="100" y2="88" stroke="#dfe3d9" strokeWidth="0.7" />
        <polygon points={`0,88 ${coords} 100,88`} fill={`url(#fill-${color.replace('#', '')})`} />
        <polyline points={coords} fill="none" stroke={color} strokeWidth="2.2" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="flex justify-between text-[10px] text-[#8a9386]">
        <span>{new Date(labels[0]).toLocaleDateString('es', { day: '2-digit', month: 'short' })}</span>
        <span>{new Date(labels.at(-1)!).toLocaleDateString('es', { day: '2-digit', month: 'short' })}</span>
      </div>
    </div>
  );
}

function HorizontalBars({ values, formatter, danger = false }: {
  values: Array<{ label: string; value: number }>;
  formatter: (value: number) => string;
  danger?: boolean;
}) {
  if (values.length === 0) return <EmptyChart />;
  const max = Math.max(...values.map((item) => item.value), 1);
  return (
    <div className="space-y-4 overflow-y-auto">
      {values.slice(0, 6).map((item) => (
        <div key={item.label}>
          <div className="mb-1.5 flex justify-between gap-3 text-xs">
            <span className="truncate font-medium">{item.label}</span>
            <span className="font-mono text-[#707a6c]">{formatter(item.value)}</span>
          </div>
          <div className="h-2.5 rounded-full bg-[#edf0e9]">
            <div
              className={`h-full rounded-full ${danger ? 'bg-red-500' : 'bg-[#3d795d]'}`}
              style={{ width: `${Math.max(2, (item.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyChart() {
  return <div className="flex h-full items-center justify-center text-sm text-[#8a9386]">Sin datos en este período</div>;
}

function aggregateDaily(rows: DailyMetric[]) {
  const byDay = new Map<string, { day: string; requests: number; duration: number; totalCostUsd: number }>();
  for (const row of rows) {
    const day = row.day.slice(0, 10);
    const item = byDay.get(day) ?? { day, requests: 0, duration: 0, totalCostUsd: 0 };
    item.requests += row.requests;
    item.duration += row.averageDurationMs * row.requests;
    item.totalCostUsd += row.totalCostUsd;
    byDay.set(day, item);
  }
  return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day)).map((item) => ({
    day: item.day,
    averageDurationMs: item.requests > 0 ? item.duration / item.requests : 0,
    totalCostUsd: item.totalCostUsd,
  }));
}

function aggregateBy(rows: DailyMetric[], key: 'model', metric: 'totalTokens') {
  const values = new Map<string, number>();
  for (const row of rows) values.set(row[key], (values.get(row[key]) ?? 0) + row[metric]);
  return [...values].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

function aggregateProviderErrors(rows: DailyMetric[]) {
  const values = new Map<string, { requests: number; errors: number }>();
  for (const row of rows) {
    const item = values.get(row.provider) ?? { requests: 0, errors: 0 };
    item.requests += row.requests;
    item.errors += row.errors;
    values.set(row.provider, item);
  }
  return [...values].map(([label, value]) => ({
    label,
    value: value.requests > 0 ? (value.errors / value.requests) * 100 : 0,
  })).sort((a, b) => b.value - a.value);
}

const TABS = ['Resumen', 'Prompt', 'Contexto', 'Respuesta', 'Timeline', 'Validaciones'] as const;
type InspectorTab = typeof TABS[number];

function GenerationInspector({ id, onBack }: { id: string; onBack: () => void }) {
  const [detail, setDetail] = useState<GenerationDetail | null>(null);
  const [tab, setTab] = useState<InspectorTab>('Resumen');
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setDetail(null);
    setError(null);
    void fetchGenerationDetail(id)
      .then(setDetail)
      .catch((loadError) => setError(loadError instanceof Error ? loadError : new Error(String(loadError))));
  }, [id]);

  if (error) {
    return (
      <div>
        <button onClick={onBack} className="mb-6 flex items-center gap-2 text-sm font-semibold text-[#226046]"><ArrowLeft size={16} /> Volver</button>
        <div className="rounded-3xl bg-red-50 p-8 text-red-700">{error.message}</div>
      </div>
    );
  }
  if (!detail) return <div className="py-24 text-center text-[#707a6c]">Cargando generación…</div>;
  const generation = detail.generation;

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-[#226046]"><ArrowLeft size={16} /> Todas las generaciones</button>
      <section className="rounded-[2rem] bg-white p-6 shadow-[0_16px_50px_rgba(25,28,23,0.06)]">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={generation.status === 'completed' ? 'success' : 'danger'}>
                {generation.status === 'completed' ? 'Completado' : 'Fallido'}
              </Badge>
              <Badge variant="neutral">{generation.operation}</Badge>
            </div>
            <h1 className="mt-4 font-heading text-2xl font-bold text-[#226046]">Generation</h1>
            <p className="mt-1 break-all font-mono text-xs text-[#707a6c]">{generation.id}</p>
          </div>
          <Button variant="secondary" disabled icon={<RefreshCw size={16} />}>Replay controlado — próximamente</Button>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-[#edf0e9] pt-6 md:grid-cols-4 xl:grid-cols-8">
          <Meta label="Usuario" value={generation.user?.displayName ?? generation.userId.slice(0, 12)} />
          <Meta label="Fecha" value={formatDate(generation.startedAt)} />
          <Meta label="Proveedor" value={generation.provider} />
          <Meta label="Modelo" value={generation.model} />
          <Meta label="Prompt" value={generation.recipe.promptVersion ?? '—'} />
          <Meta label="Algoritmo" value={generation.recipe.algorithmVersion ?? '—'} />
          <Meta label="Tiempo" value={formatDuration(generation.totalDurationMs)} />
          <Meta label="Costo" value={formatCost(generation.totalCostUsd)} />
        </div>
      </section>

      <nav className="flex gap-1 overflow-x-auto rounded-2xl bg-[#eef1e8] p-1">
        {TABS.map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              tab === item ? 'bg-white text-[#226046] shadow-sm' : 'text-[#707a6c]'
            }`}
          >
            {item}
          </button>
        ))}
      </nav>

      <section className="min-h-[420px] rounded-[2rem] bg-white p-5 shadow-[0_16px_50px_rgba(25,28,23,0.05)] md:p-7">
        {tab === 'Resumen' && <InspectorSummary detail={detail} />}
        {tab === 'Prompt' && (
          <PayloadPanel detail={detail} types={['system_prompt', 'user_prompt']} />
        )}
        {tab === 'Contexto' && <PayloadPanel detail={detail} types={['context']} />}
        {tab === 'Respuesta' && (
          <PayloadPanel detail={detail} types={['raw_response', 'parsed_response', 'parse_error']} />
        )}
        {tab === 'Timeline' && <Timeline detail={detail} />}
        {tab === 'Validaciones' && <QualityPanel detail={detail} />}
      </section>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[10px] font-bold uppercase tracking-wider text-[#8a9386]">{label}</p><p className="mt-1 truncate text-sm font-semibold" title={value}>{value}</p></div>;
}

function InspectorSummary({ detail }: { detail: GenerationDetail }) {
  const generation = detail.generation;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <SectionTitle icon={<BarChart3 size={18} />} title="Uso y costo" />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <SmallStat label="Input tokens" value={formatNumber(generation.inputTokens)} />
          <SmallStat label="Output tokens" value={formatNumber(generation.outputTokens)} />
          <SmallStat label="Total tokens" value={formatNumber(generation.totalTokens)} />
          <SmallStat label="Reintentos" value={String(generation.retryCount)} />
        </div>
      </div>
      <div>
        <SectionTitle icon={<Database size={18} />} title="Receta reproducible" />
        <dl className="mt-4 space-y-3">
          {Object.entries(generation.recipe).map(([key, value]) => value && (
            <div key={key} className="flex justify-between gap-4 border-b border-[#edf0e9] pb-2 text-xs">
              <dt className="text-[#707a6c]">{key}</dt>
              <dd className="max-w-[65%] truncate font-mono" title={value}>{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      {generation.errorCategory && (
        <div className="rounded-2xl bg-red-50 p-4 lg:col-span-2">
          <p className="font-semibold text-red-700">{generation.errorCategory}</p>
          <p className="mt-1 font-mono text-xs text-red-600">{generation.errorCode}</p>
        </div>
      )}
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-[#226046]">{icon}{title}</h2>;
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-[#f3f5eb] p-4"><p className="text-xs text-[#707a6c]">{label}</p><p className="mt-2 font-mono text-xl font-bold">{value}</p></div>;
}

function PayloadPanel({ detail, types }: { detail: GenerationDetail; types: string[] }) {
  const payloads = types.map((type) => detail.payloads.find((payload) => payload.type === type)).filter(Boolean);
  if (payloads.length === 0) {
    return <PayloadUnavailable enabled={detail.payloadInspectionEnabled} />;
  }
  return (
    <div className="space-y-6">
      {payloads.map((payload) => payload && (
        <div key={`${payload.type}-${payload.hash}`}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold capitalize text-[#226046]">{payload.type.replaceAll('_', ' ')}</h2>
            <span className="font-mono text-[10px] text-[#8a9386]">{formatNumber(payload.sizeBytes)} bytes</span>
          </div>
          {payload.content
            ? <CodeBlock content={payload.content} />
            : (
              <div className="rounded-2xl bg-[#f3f5eb] p-5 text-sm text-[#707a6c]">
                Contenido no disponible. Hash: <span className="break-all font-mono text-xs">{payload.hash}</span>
              </div>
            )}
        </div>
      ))}
    </div>
  );
}

function PayloadUnavailable({ enabled }: { enabled: boolean }) {
  return (
    <div className="flex min-h-[330px] flex-col items-center justify-center text-center">
      <ShieldAlert size={36} className="text-[#8a9386]" />
      <p className="mt-4 font-semibold">Payload no capturado</p>
      <p className="mt-2 max-w-md text-sm text-[#707a6c]">
        {enabled
          ? 'Esta generación no contiene un payload cifrado o ya expiró.'
          : 'La inspección sensible está deshabilitada. Activa captura cifrada e inspección explícita para verla.'}
      </p>
    </div>
  );
}

function CodeBlock({ content }: { content: string }) {
  const formatted = useMemo(() => {
    try {
      return JSON.stringify(JSON.parse(content), null, 2);
    } catch {
      return content;
    }
  }, [content]);
  return <pre className="max-h-[560px] overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-[#191c17] p-5 font-mono text-xs leading-relaxed text-[#dce8dd]">{formatted}</pre>;
}

function Timeline({ detail }: { detail: GenerationDetail }) {
  const total = Math.max(...detail.stages.map((stage) => stage.durationMs), 1);
  return (
    <div>
      <SectionTitle icon={<Clock3 size={18} />} title="Timeline de ejecución" />
      <div className="mt-6 space-y-3">
        {detail.stages.map((stage) => (
          <div key={`${stage.sequence}-${stage.stage}`} className="grid grid-cols-[44px_1fr_80px] items-center gap-3">
            <span className="font-mono text-[10px] text-[#8a9386]">#{stage.sequence}</span>
            <div>
              <div className="mb-1 flex items-center gap-2 text-sm font-medium">
                {stage.stage.replaceAll('_', ' ')}
                {!stage.success && <span className="text-xs text-red-600">falló</span>}
              </div>
              <div className="h-2 rounded-full bg-[#edf0e9]">
                <div
                  className={`h-full rounded-full ${stage.success ? 'bg-[#3d795d]' : 'bg-red-500'}`}
                  style={{ width: `${Math.max(1, (stage.durationMs / total) * 100)}%` }}
                />
              </div>
            </div>
            <span className="text-right font-mono text-xs">{formatDuration(stage.durationMs)}</span>
          </div>
        ))}
      </div>
      {detail.attempts.length > 0 && (
        <div className="mt-10">
          <h3 className="font-heading font-bold text-[#226046]">Intentos del proveedor</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {detail.attempts.map((attempt) => (
              <div key={attempt.attempt} className="rounded-2xl bg-[#f3f5eb] p-4 text-sm">
                <div className="flex justify-between">
                  <span className="font-semibold">Intento {attempt.attempt}</span>
                  <Badge size="sm" variant={attempt.success ? 'success' : 'danger'}>{attempt.success ? 'OK' : 'Error'}</Badge>
                </div>
                <p className="mt-2 font-mono text-xs text-[#707a6c]">{formatDuration(attempt.durationMs)} · {attempt.model}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function QualityPanel({ detail }: { detail: GenerationDetail }) {
  if (detail.quality.length === 0) return <EmptyChart />;
  return (
    <div>
      <SectionTitle icon={<FileJson size={18} />} title="Validaciones" />
      <div className="mt-6 divide-y divide-[#edf0e9]">
        {detail.quality.map((metric, index) => (
          <div key={`${metric.name}-${index}`} className="flex items-start justify-between gap-4 py-4">
            <div>
              <p className="font-semibold">{metric.name}</p>
              <p className="mt-1 text-xs text-[#707a6c]">
                {metric.evaluator} · {metric.evaluatorVersion} · {metric.source}
              </p>
              {(metric.expected || metric.actual) && (
                <p className="mt-1 font-mono text-xs text-[#707a6c]">esperado {metric.expected ?? '—'} · real {metric.actual ?? '—'}</p>
              )}
            </div>
            <Badge variant={metric.status === 'pass' ? 'success' : metric.status === 'fail' ? 'danger' : 'neutral'}>
              {metric.status === 'pass' ? '✓ Cumple' : metric.status === 'fail' ? '✕ No cumple' : String(metric.value)}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
