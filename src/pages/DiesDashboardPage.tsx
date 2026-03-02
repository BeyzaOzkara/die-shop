import { useState, useEffect } from 'react';
import { ArrowLeft, Package, Box, BarChart2, ChevronDown, ChevronUp } from 'lucide-react';
import { getDieStats } from '../services/dieService';
import type { DieStats } from '../services/dieService';

interface Props {
    onBack: () => void;
}

export function DiesDashboardPage({ onBack }: Props) {
    const [stats, setStats] = useState<DieStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAll, setShowAll] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const data = await getDieStats();
                setStats(data);
            } catch (err) {
                console.error('Stats yüklenemedi:', err);
                setError('İstatistikler yüklenirken bir hata oluştu.');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const totalComponentRows = stats?.components.reduce(
        (sum, c) => sum + c.component_rows_count,
        0
    ) ?? 0;

    const visibleComponents = showAll
        ? (stats?.components ?? [])
        : (stats?.components ?? []).slice(0, 8);

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-4"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Kalıplara Dön
                </button>
                <h1 className="text-3xl font-bold text-gray-900">Genel Durum</h1>
                <h2>YAPIM AŞAMASINDA</h2>
                <p className="text-gray-500 mt-1 text-sm">
                    Tüm kalıplara ait genel istatistikler.
                </p>
            </div>

            {/* Loading skeleton */}
            {loading && (
                <div className="space-y-4 animate-pulse">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[0, 1, 2].map((i) => (
                            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 h-24" />
                        ))}
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 h-48" />
                </div>
            )}

            {/* Error */}
            {!loading && error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                    {error}
                </div>
            )}

            {/* Content */}
            {!loading && stats && (
                <div className="space-y-6">
                    {/* Summary cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <StatCard
                            icon={<Package className="w-6 h-6 text-blue-600" />}
                            bg="bg-blue-50"
                            label="Toplam Kalıp"
                            value={stats.total_dies}
                        />
                        <StatCard
                            icon={<Box className="w-6 h-6 text-purple-600" />}
                            bg="bg-purple-50"
                            label="Toplam Profil"
                            value={stats.total_profiles}
                        />
                        <StatCard
                            icon={<BarChart2 className="w-6 h-6 text-green-600" />}
                            bg="bg-green-50"
                            label="Toplam Bileşen Satırı"
                            value={totalComponentRows}
                        />
                    </div>

                    {/* Component breakdown */}
                    {stats.components.length > 0 ? (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                                <h2 className="text-base font-semibold text-gray-800">Bileşen Dağılımı</h2>
                                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                    {stats.components.length} tip
                                </span>
                            </div>

                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100">
                                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                                            Bileşen
                                        </th>
                                        <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                                            Bileşen Satırı
                                        </th>
                                        <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                                            Kalıp Sayısı
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {visibleComponents.map((c, idx) => (
                                        <tr
                                            key={c.component_type_id}
                                            className={`hover:bg-gray-50 transition-colors ${idx === 0 ? 'font-medium' : ''}`}
                                        >
                                            <td className="px-5 py-3 text-gray-800">{c.component_type_name}</td>
                                            <td className="px-5 py-3 text-right tabular-nums text-gray-700">
                                                {c.component_rows_count.toLocaleString('tr-TR')}
                                            </td>
                                            <td className="px-5 py-3 text-right tabular-nums text-gray-700">
                                                {c.die_count.toLocaleString('tr-TR')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {stats.components.length > 8 && (
                                <button
                                    onClick={() => setShowAll((v) => !v)}
                                    className="w-full flex items-center justify-center gap-1.5 py-3 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors border-t border-gray-100"
                                >
                                    {showAll ? (
                                        <><ChevronUp className="w-3.5 h-3.5" /> Daha Az Göster</>
                                    ) : (
                                        <><ChevronDown className="w-3.5 h-3.5" /> Tümünü Göster ({stats.components.length})</>
                                    )}
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400 text-sm">
                            Bileşen verisi bulunamadı.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Small stat card ──────────────────────────────────────
function StatCard({
    icon,
    bg,
    label,
    value,
}: {
    icon: React.ReactNode;
    bg: string;
    label: string;
    value: number;
}) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
            <div className={`${bg} p-3 rounded-xl`}>{icon}</div>
            <div>
                <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                <p className="text-2xl font-bold text-gray-900 tabular-nums">
                    {value.toLocaleString('tr-TR')}
                </p>
            </div>
        </div>
    );
}
