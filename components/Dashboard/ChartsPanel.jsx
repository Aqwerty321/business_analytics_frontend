import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { computeMomGrowth } from '../../utils/analytics';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);

export default function ChartsPanel({ revenueTimeseries = [], segmentBreakdown = [] }) {
  if (!revenueTimeseries.length) {
    return (
      <section className="glass-panel rounded-2xl p-4">
        <h3 className="text-lg font-semibold text-slate-100">Financial charts</h3>
        <p className="mt-2 text-sm text-slate-300">
          No data available. Upload internal data or request a deeper metrics analysis.
        </p>
      </section>
    );
  }

  const labels = revenueTimeseries.map((entry) => entry.period);
  const revenueValues = revenueTimeseries.map((entry) => Number(entry.value || 0));
  const momSeries = computeMomGrowth(revenueTimeseries);

  const lineData = {
    labels,
    datasets: [
      {
        label: 'Revenue',
        data: revenueValues,
        borderColor: '#1f8fff',
        backgroundColor: 'rgba(31, 143, 255, 0.2)',
        tension: 0.3
      }
    ]
  };

  const barData = {
    labels: segmentBreakdown.map((entry) => entry.segment),
    datasets: [
      {
        label: 'Segment Revenue',
        data: segmentBreakdown.map((entry) => Number(entry.value || 0)),
        backgroundColor: ['#1f8fff', '#14b8a6', '#0ea5e9', '#22c55e']
      }
    ]
  };

  const momData = {
    labels: momSeries.map((entry) => entry.period),
    datasets: [
      {
        label: 'MoM Growth %',
        data: momSeries.map((entry) => entry.growthPct),
        backgroundColor: '#14b8a6'
      }
    ]
  };

  const axisColor = '#94a3b8';

  const options = {
    responsive: true,
    plugins: {
      legend: {
        labels: {
          color: '#e6eef8'
        }
      }
    },
    scales: {
      x: {
        ticks: { color: axisColor },
        grid: { color: 'rgba(148,163,184,0.18)' }
      },
      y: {
        ticks: { color: axisColor },
        grid: { color: 'rgba(148,163,184,0.18)' }
      }
    }
  };

  return (
    <section className="glass-panel rounded-2xl p-4">
      <h3 className="text-lg font-semibold text-slate-100">Financial charts</h3>
      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-700/80 bg-slate-900/60 p-3">
          <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Revenue time series</p>
          <Line options={options} data={lineData} />
        </div>

        <div className="rounded-xl border border-slate-700/80 bg-slate-900/60 p-3">
          <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Segment breakdown</p>
          {segmentBreakdown.length > 0 ? (
            <Bar options={options} data={barData} />
          ) : (
            <p className="text-sm text-slate-300">No segment data available.</p>
          )}
        </div>

        <div className="rounded-xl border border-slate-700/80 bg-slate-900/60 p-3 lg:col-span-2">
          <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">MoM growth</p>
          <Bar options={options} data={momData} />
        </div>
      </div>
    </section>
  );
}
