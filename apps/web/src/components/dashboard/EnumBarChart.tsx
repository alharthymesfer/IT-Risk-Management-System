import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useLocale } from '../../i18n/LocaleContext';

interface EnumBarChartProps<K extends string> {
  data: Partial<Record<K, number>>;
  order: readonly K[];
  colorMap: Record<K, string>;
  labelFor: (key: K) => string;
}

const Y_AXIS_TICK_FONT = '12px system-ui, -apple-system, "Segoe UI", sans-serif';
const Y_AXIS_MIN_WIDTH = 96;
const Y_AXIS_MAX_WIDTH = 220;
const Y_AXIS_LABEL_PADDING = 24;

let measureCanvas: HTMLCanvasElement | null = null;

/** Measures rendered text width so the Y-axis reserves enough room for the actual label —
 * script-agnostic, so Arabic (wider glyphs, longer words) gets as much space as it needs
 * instead of the fixed pixel budget tuned for short English words. */
function measureTextWidth(text: string): number {
  if (typeof document === 'undefined') return text.length * 7;
  measureCanvas ??= document.createElement('canvas');
  const ctx = measureCanvas.getContext('2d');
  if (!ctx) return text.length * 7;
  ctx.font = Y_AXIS_TICK_FONT;
  return ctx.measureText(text).width;
}

interface CategoryTickProps {
  x?: number;
  y?: number;
  payload?: { value: string };
}

/**
 * Renders the Y-axis category label as a single plain <text> node instead of letting
 * Recharts' built-in tick renderer handle it.
 *
 * Root cause this works around: Recharts' CartesianAxis spreads the axis's own `width`
 * prop onto every tick's internal <Text> component, and that component auto-wraps its
 * content into multiple <tspan> lines whenever `width` is set (see
 * recharts/es6/component/Text.js -> getWordsByLines). Its word-splitting/measurement
 * isn't reliable for Arabic and was producing a corrupted, duplicated-looking fragment.
 * Rendering our own <text> here means `width` is never used as a wrap boundary, so the
 * label always renders exactly once, in full.
 *
 * `direction="ltr"` pins the SVG text-anchor math to the physical side Recharts actually
 * computed it for (`textAnchor="end"` assumes LTR). `direction` is an inherited CSS
 * property, so without this the app's `dir="rtl"` would flip which physical side "end"
 * anchors to and push the label into the bars. This does not affect how the Arabic
 * glyphs themselves are shaped/ordered — the browser's Unicode Bidi Algorithm still
 * renders an embedded strong-RTL run (the label text) correctly right-to-left regardless
 * of the surrounding paragraph's base direction.
 */
function CategoryAxisTick({ x, y, payload }: CategoryTickProps) {
  if (x == null || y == null || !payload) return null;
  return (
    <text x={x} y={y} dy="0.355em" textAnchor="end" direction="ltr" fill="#334155" fontSize={12}>
      {payload.value}
    </text>
  );
}

export function EnumBarChart<K extends string>({
  data,
  order,
  colorMap,
  labelFor,
}: EnumBarChartProps<K>) {
  const { t } = useLocale();
  const chartData = order.map((key) => ({
    key,
    label: labelFor(key),
    value: data[key] ?? 0,
  }));

  const widestLabel = chartData.reduce((max, d) => Math.max(max, measureTextWidth(d.label)), 0);
  const yAxisWidth = Math.min(
    Math.max(Math.ceil(widestLabel) + Y_AXIS_LABEL_PADDING, Y_AXIS_MIN_WIDTH),
    Y_AXIS_MAX_WIDTH,
  );

  const total = chartData.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-slate-400">
        {t('dashboard.noRisksYet')}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ left: 0, right: 24, top: 4, bottom: 4 }}
      >
        <XAxis
          type="number"
          allowDecimals={false}
          tick={{ fontSize: 12, fill: '#64748b' }}
          axisLine={{ stroke: '#e2e8f0' }}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={yAxisWidth}
          tick={<CategoryAxisTick />}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: '#f8fafc' }}
          formatter={(value) => [`${value}`, t('dashboard.chartRisksLabel')]}
          contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#e2e8f0' }}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20}>
          {chartData.map((entry) => (
            <Cell key={entry.key} fill={colorMap[entry.key]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
