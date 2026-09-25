import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Factory, Calendar, Clock, PlayCircle, PauseCircle, CheckCircle } from 'lucide-react';
import { api } from '../lib/api';

interface OperationInterval {
  operation_id: number;
  operation_name: string;
  work_order_number?: string;
  status: string;
  start_time: string;
  end_time?: string;
  duration_minutes: number;
  operator_name?: string;
  total_operation_duration_minutes?: number;
  daily_breakdown?: Record<string, number>;
}

interface WorkCenterDailyStats {
  work_center_id: number;
  work_center_name: string;
  operating_time_minutes: number;
  downtime_minutes: number;
  intervals: OperationInterval[];
}

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'work-centers'>('work-centers');

  // Tab: Work Centers
  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [stats, setStats] = useState<WorkCenterDailyStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState<WorkCenterDailyStats | null>(null);

  useEffect(() => {
    if (activeTab === 'work-centers') {
      loadDailyStats();
    }
  }, [date, activeTab]);

  const loadDailyStats = async () => {
    try {
      setLoading(true);
      const res = await api.get<WorkCenterDailyStats[]>(`/reports/work-centers/daily-stats?target_date=${date}`);
      setStats(res || []);
    } catch (e) {
      console.error('Failed to load stats', e);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ONGOING':
      case 'START':
      case 'RESUME':
      case 'BATCH_START':
        return <PlayCircle className="w-4 h-4 text-blue-500" />;
      case 'PAUSED':
        return <PauseCircle className="w-4 h-4 text-yellow-500" />;
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatStatus = (status: string) => {
    const map: Record<string, string> = {
      'ONGOING': 'Devam Ediyor',
      'START': 'Başladı',
      'RESUME': 'Devam Ediyor',
      'BATCH_START': 'Seri Başladı',
      'PAUSED': 'Duraklatıldı',
      'COMPLETED': 'Tamamlandı',
      'CANCELLED': 'İptal Edildi'
    };
    return map[status] || status;
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('work-centers')}
          className={`pb-2 px-4 font-medium text-sm transition-colors ${activeTab === 'work-centers'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          <div className="flex items-center gap-2">
            <Factory className="w-4 h-4" />
            Çalışma Merkezi Performansı
          </div>
        </button>
      </div>

      {activeTab === 'work-centers' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Günlük Operasyon / Duruş Dağılımı</h2>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-500" />
              <input
                type="date"
                value={date}
                max={format(new Date(), 'yyyy-MM-dd')}
                onChange={(e) => setDate(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center text-gray-500 py-10">Yükleniyor...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...stats].sort((a, b) => b.operating_time_minutes - a.operating_time_minutes).map((stat) => {
                const data = [
                  { name: 'Çalışma Süresi', value: parseFloat(stat.operating_time_minutes.toFixed(1)) },
                  { name: 'Duruş Süresi', value: parseFloat(stat.downtime_minutes.toFixed(1)) }
                ];
                const COLORS = ['#10B981', '#EF4444']; // Green for operating, Red for downtime

                const totalMins = stat.operating_time_minutes + stat.downtime_minutes;
                const utilRatio = totalMins > 0 ? (stat.operating_time_minutes / totalMins) * 100 : 0;

                return (
                  <div key={stat.work_center_id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col items-center">
                    <h3 className="font-semibold text-gray-700 mb-2">{stat.work_center_name}</h3>
                    <div className="w-full h-64 relative cursor-pointer" onClick={() => setSelectedCenter(stat)}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            nameKey="name"
                          >
                            {data.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => {
                            const hours = Math.floor(value / 60);
                            const mins = Math.round(value % 60);
                            if (hours > 0) return `${hours} sa ${mins} dk`;
                            return `${mins} dk`;
                          }} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-6">
                        <span className="text-xs text-gray-500">Kullanım</span>
                        <span className="text-lg font-bold text-gray-800">
                          {utilRatio.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-blue-600 cursor-pointer hover:underline" onClick={() => setSelectedCenter(stat)}>
                      Detayları Gör
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {selectedCenter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{selectedCenter.work_center_name} Detayları</h3>
                <p className="text-sm text-gray-500">{format(parseISO(date), 'd MMMM yyyy', { locale: tr })}</p>
              </div>
              <button
                onClick={() => setSelectedCenter(null)}
                className="text-gray-400 hover:text-gray-600 p-2 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 bg-gray-50">
              {selectedCenter.intervals.length === 0 ? (
                <div className="text-center text-gray-500 py-8 bg-white rounded-lg shadow-sm border border-gray-200">
                  Bu güne ait operasyon kaydı bulunamadı.
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedCenter.intervals.map((interval, idx) => (
                    <div key={idx} className="flex gap-4 p-4 border border-gray-200 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex flex-col items-center justify-center w-24 shrink-0 border-r border-gray-100 pr-4">
                        <span className="text-sm font-bold text-gray-800">
                          {format(parseISO(interval.start_time), 'HH:mm')}
                        </span>
                        <span className="text-xs text-gray-500 mt-1">
                          {interval.end_time ? format(parseISO(interval.end_time), 'HH:mm') : 'Devam'}
                        </span>
                      </div>

                      <div className="flex-1 flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-1.5">
                          {getStatusIcon(interval.status)}
                          <span className="text-sm font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                            {formatStatus(interval.status)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-700">
                          <span className="font-semibold text-gray-900">{interval.operation_name}</span>
                          {interval.work_order_number && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              Sipariş: {interval.work_order_number}
                            </span>
                          )}
                          {interval.operator_name && (
                            <div className="mt-1 text-xs text-gray-500">
                              <span className="font-medium">Operatör: </span>
                              {interval.operator_name}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-end shrink-0">
                        <div className="flex flex-col items-end justify-center bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                          <span className="text-sm font-bold text-blue-700">
                            Bugün: {interval.duration_minutes.toFixed(1)} dk
                          </span>
                          {interval.total_operation_duration_minutes !== undefined && (
                            <div className="mt-1 flex flex-col items-end">
                              <span className="text-xs font-medium text-blue-500" title="Tüm günlerdeki toplam operasyon süresi">
                                Toplam: {interval.total_operation_duration_minutes.toFixed(1)} dk
                              </span>
                              {interval.daily_breakdown && Object.keys(interval.daily_breakdown).length > 1 && (
                                <div className="mt-1 pt-1 border-t border-blue-200/50 flex flex-col items-end gap-0.5">
                                  {Object.entries(interval.daily_breakdown).map(([dayStr, dur]) => (
                                    <span key={dayStr} className="text-[10px] text-blue-400 font-medium">
                                      {format(parseISO(dayStr), 'dd MMM', { locale: tr })}: {dur.toFixed(1)} dk
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
