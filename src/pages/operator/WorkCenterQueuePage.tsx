// src/pages/operator/WorkCenterQueuePage.tsx
import { useState, useEffect } from 'react';
import {
  LogOut,
  RefreshCw,
  Play,
  Pause,
  Check,
  Clock,
  AlertCircle,
  Eye
} from 'lucide-react';
import {
  getWorkCenterOperations,
  startOperation,
  pauseOperation,
  completeOperation,
} from '../../services/operatorService';
import type { Operator, WorkOrderOperation, WorkCenter } from '../../types/database';
import { ApiError } from '../../lib/api';
import { mediaUrl } from '../../lib/media';

interface WorkCenterQueuePageProps {
  operator: Operator;
  onLogout: () => void;
}

const VIEWER_BASE = import.meta.env.VITE_DXF_VIEWER_BASE_URL ?? "/dxf-viewer";//"http://arslan:8082";

const dxfViewerUrl = (fileUrl: string) => {
  return `${VIEWER_BASE}/?file=${encodeURIComponent(fileUrl)}`;
};

export function WorkCenterQueuePage({ operator, onLogout }: WorkCenterQueuePageProps) {
  const [operations, setOperations] = useState<WorkOrderOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [error, setError] = useState('');

  // 🔹 Operatörün çalıştığı çalışma merkezleri
  const workCenters: WorkCenter[] = operator.work_centers ?? [];

  // 🔹 Şu an seçili çalışma merkezi
  const [currentWorkCenterId, setCurrentWorkCenterId] = useState<number | null>(
    workCenters.length > 0 ? workCenters[0].id : null
  );

  // operator değiştiğinde (login olurken) current center’ı güncelle
  useEffect(() => {
    if (operator.work_centers && operator.work_centers.length > 0) {
      setCurrentWorkCenterId(operator.work_centers[0].id);
    } else {
      setCurrentWorkCenterId(null);
    }
  }, [operator]);

  useEffect(() => {
    const firstId = operator.work_centers?.[0]?.id ?? null;

    setCurrentWorkCenterId((prev) => {
      // kullanıcı zaten seçim yaptıysa bozma
      if (prev != null) return prev;
      return firstId;
    });
  }, [operator.id]); // veya [operator.id, operator.work_centers?.length]

  // Seçili work center değişince operasyonları yükle + interval
  useEffect(() => {
    if (currentWorkCenterId == null) {
      setOperations([]);
      setLoading(false);
      return;
    }

    const load = () => loadOperations(currentWorkCenterId, true);

    load();
    const interval = setInterval(load, 30000);

    return () => clearInterval(interval);
  }, [currentWorkCenterId]);

  const loadOperations = async (workCenterId: number, silent = false) => {
    try {
      setError('');
      // setLoading(true);
      if (!silent) setLoading(true);
      const data = await getWorkCenterOperations(workCenterId);
      setOperations(data);
    } catch (err: any) {
      console.error('Operasyonlar yüklenemedi:', err);
      setError('Operasyonlar yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleStartOperation = async (operation: WorkOrderOperation) => {
    if (!confirm('Bu operasyonu başlatmak istediğinizden emin misiniz?')) return;

    try {
      setActionLoading(operation.id);
      await startOperation(operation.id, operator.id, operator.name);
      if (currentWorkCenterId != null) {
        await loadOperations(currentWorkCenterId);
      }
    } catch (err: any) {
      console.error('Operasyon başlatılamadı:', err);
      if (err instanceof ApiError) {
        // 🔹 Artık burada direkt düzgün Türkçe mesaj var:
        // "Önceki operasyon(lar) tamamlanmadan bu operasyon başlatılamaz."
        alert(err.message);
      } else {
        alert('Operasyon başlatılırken bir hata oluştu');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handlePauseOperation = async (operation: WorkOrderOperation) => {
    if (!confirm('Bu operasyonu duraklatmak istediğinizden emin misiniz?')) return;

    try {
      setActionLoading(operation.id);
      await pauseOperation(operation.id);
      if (currentWorkCenterId != null) {
        await loadOperations(currentWorkCenterId);
      }
    } catch (err: any) {
      console.error('Operasyon duraklatılamadı:', err);
      alert('Operasyon duraklatılırken bir hata oluştu');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCompleteOperation = async (operation: WorkOrderOperation) => {
    if (!confirm('Bu operasyonu tamamlamak istediğinizden emin misiniz?')) return;

    try {
      setActionLoading(operation.id);
      await completeOperation(operation.id);
      if (currentWorkCenterId != null) {
        await loadOperations(currentWorkCenterId);
      }
      alert('Operasyon başarıyla tamamlandı!');
    } catch (err: any) {
      console.error('Operasyon tamamlanamadı:', err);
      alert('Operasyon tamamlanırken bir hata oluştu');
    } finally {
      setActionLoading(null);
    }
  };

  const activeOperation = operations.find((op) => op.status === 'InProgress');
  const waitingOperations = operations.filter((op) => op.status === 'Waiting' || op.status === 'Paused' );

  const canStartOperation = (operation: WorkOrderOperation) => {
    const previousOps = operations.filter(
      (op) =>
        op.sequence_number < operation.sequence_number &&
        op.work_order_id === operation.work_order_id
    );

    // tüm önceki operasyonlar Completed ise true
    return previousOps.every((op) => op.status === 'Completed');
  };

  const getStatusColor = (status: string) => {
    const colors = {
      Waiting: 'bg-gray-100 text-gray-800',
      InProgress: 'bg-yellow-100 text-yellow-800',
      Paused: 'bg-orange-100 text-orange-800',
      Completed: 'bg-green-100 text-green-800',
      Cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status as keyof typeof colors] || colors.Waiting;
  };

  const getStatusText = (status: string) => {
    const texts = {
      Waiting: 'Bekliyor',
      Paused: 'Duraklatıldı',
      InProgress: 'Devam Ediyor',
      Completed: 'Tamamlandı',
      Cancelled: 'İptal Edildi',
    };
    return texts[status as keyof typeof texts] || status;
  };

  const currentWorkCenter = workCenters.find((wc) => wc.id === currentWorkCenterId) || null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {currentWorkCenter ? currentWorkCenter.name : 'Çalışma Merkezi Seçilmedi'}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Operatör: {operator.name}
                {operator.employee_number && ` (${operator.employee_number})`}
              </p>

              {/* Birden fazla çalışma merkezi varsa seçim dropdown’ı */}
              {workCenters.length > 1 && (
                <div className="mt-2">
                  <label className="text-xs text-gray-500 mr-2">
                    Çalışma Merkezi Seç:
                  </label>
                  <select
                    value={currentWorkCenterId ?? ''}
                    onChange={(e) =>
                      setCurrentWorkCenterId(
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    {workCenters.map((wc) => (
                      <option key={wc.id} value={wc.id}>
                        {wc.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => currentWorkCenterId != null && loadOperations(currentWorkCenterId)}
                disabled={loading || currentWorkCenterId == null}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                <span>Yenile</span>
              </button>
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>Çıkış</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-6 flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {currentWorkCenterId == null && (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Bu operatöre atanmış çalışma merkezi yok
            </h3>
            <p className="text-gray-600">
              Lütfen yönetim panelinden operatöre en az bir çalışma merkezi atayın.
            </p>
          </div>
        )}

        {currentWorkCenterId != null && (
          <>
            {activeOperation && (
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Aktif Operasyon</h2>
                <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-6 shadow-lg">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-yellow-400 text-yellow-900 font-bold text-lg">
                          {activeOperation.sequence_number}
                        </span>
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900">
                            {/* {activeOperation.operation_name} */}
                            {activeOperation.operation_type?.name}
                          </h3>
                          <p className="text-gray-600">
                            İş Emri: {activeOperation.work_order?.order_number}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="bg-white rounded-lg p-3">
                          <p className="text-sm text-gray-600">Kalıp</p>
                          <p className="font-semibold text-gray-900">
                            {
                              activeOperation.work_order?.production_order?.die
                                ?.die_number
                            }
                          </p>
                        </div>
                        <div className="bg-white rounded-lg p-3">
                          <p className="text-sm text-gray-600">Bileşen</p>
                          <p className="font-semibold text-gray-900">
                            {
                              activeOperation.work_order?.die_component
                                ?.component_type?.name
                            }
                          </p>
                        </div>

                        <div className="bg-white rounded-lg p-3">
                          <p className="text-sm text-gray-600">Kalıp Çapı</p>
                          <p className="font-semibold text-gray-900">
                            {activeOperation.work_order?.production_order?.die?.die_diameter_mm ?? '—'} mm
                          </p>
                        </div>

                        <div className="bg-white rounded-lg p-3">
                          <p className="text-sm text-gray-600">Toplam Paket Boyu</p>
                          <p className="font-semibold text-gray-900">
                            {activeOperation.work_order?.production_order?.die?.total_package_length_mm ?? '—'} mm
                          </p>
                        </div>
                        {activeOperation.estimated_duration_minutes && (
                          <div className="bg-white rounded-lg p-3">
                            <p className="text-sm text-gray-600">Tahmini Süre</p>
                            <p className="font-semibold text-gray-900">
                              {activeOperation.estimated_duration_minutes} dakika
                            </p>
                          </div>
                        )}
                        {activeOperation.started_at && (
                          <div className="bg-white rounded-lg p-3">
                            <p className="text-sm text-gray-600">Başlangıç</p>
                            <p className="font-semibold text-gray-900">
                              {new Date(
                                activeOperation.started_at
                              ).toLocaleTimeString('tr-TR')}
                            </p>
                          </div>
                        )}

                        
                      {(activeOperation.work_order?.production_order?.die?.files?.length ?? 0) > 0 && (
                        <div className="mt-4 bg-white rounded-lg p-3">
                          <p className="text-sm text-gray-600 mb-2">Kalıp Dosyaları</p>

                          <div className="space-y-1 text-sm">
                            {(activeOperation.work_order?.production_order?.die?.files ?? []).map((f) => {
                                const fileUrl = mediaUrl(f.storage_path);
                                const absoluteFileUrl = new URL(fileUrl, window.location.origin).toString();
                                const isDxf = (f.original_name ?? "").toLowerCase().endsWith(".dxf");
                                const href = isDxf ? dxfViewerUrl(absoluteFileUrl) : absoluteFileUrl;

                                return (
                                  <a
                                    key={f.id}
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                    title={isDxf ? "DXF Viewer ile aç" : "Dosyayı indir/aç"}
                                  >
                                    <Eye className="w-4 h-4" />
                                    {f.original_name}
                                    {isDxf ? <span className="text-xs text-gray-500">(Viewer)</span> : null}
                                  </a>
                                ); }
                            )}
                          </div>
                        </div>
                      )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handlePauseOperation(activeOperation)}
                      disabled={actionLoading === activeOperation.id}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-orange-500 text-white text-lg font-semibold rounded-lg hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      <Pause className="w-6 h-6" />
                      Duraklat
                    </button>
                    <button
                      onClick={() => handleCompleteOperation(activeOperation)}
                      disabled={actionLoading === activeOperation.id}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-green-600 text-white text-lg font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      <Check className="w-6 h-6" />
                      Tamamla
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Bekleyen Operasyonlar{' '}
                {waitingOperations.length > 0 && `(${waitingOperations.length})`}
              </h2>

              {waitingOperations.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                  <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Bekleyen operasyon yok
                  </h3>
                  <p className="text-gray-600">
                    Tüm operasyonlar tamamlandı veya başka bir operatör tarafından
                    işleniyor
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {waitingOperations.map((operation) => (
                    <div
                      key={operation.id}
                      className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-semibold">
                            {operation.sequence_number}
                          </span>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {/* {operation.operation_name} */}
                              {operation.operation_type?.name}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {operation.work_order?.order_number}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            operation.status
                          )}`}
                        >
                          {getStatusText(operation.status)}
                        </span>
                      </div>
                      <div className="space-y-2 mb-4 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Kalıp:</span>
                          <span className="font-medium text-gray-900">
                            {
                              operation.work_order?.production_order?.die
                                ?.die_number
                            } - {
                              operation.work_order?.die_component?.component_type
                                ?.name
                            }
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-gray-600">Kalıp Çapı:</span>
                          <span className="font-medium text-gray-900">
                            {operation.work_order?.production_order?.die?.die_diameter_mm ?? '—'} mm
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-gray-600">Toplam Paket Boyu:</span>
                          <span className="font-medium text-gray-900">
                            {operation.work_order?.production_order?.die?.total_package_length_mm ?? '—'} mm
                          </span>
                        </div>

                        {operation.estimated_duration_minutes && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Tahmini Süre:</span>
                            <span className="font-medium text-gray-900">
                              {operation.estimated_duration_minutes} dk
                            </span>
                          </div>
                        )}

                        
                        {(operation.work_order?.production_order?.die?.files?.length ?? 0) > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-xs text-gray-600 mb-2">Kalıp Dosyaları</p>

                            <div className="space-y-1 text-sm">
                              {(operation.work_order?.production_order?.die?.files ?? []).map((f) => {
                                  const fileUrl = mediaUrl(f.storage_path);
                                  const absoluteFileUrl = new URL(fileUrl, window.location.origin).toString();
                                  const isDxf = (f.original_name ?? "").toLowerCase().endsWith(".dxf");
                                  const href = isDxf ? dxfViewerUrl(absoluteFileUrl) : absoluteFileUrl;
            
                                  return (
                                    <a
                                      key={f.id}
                                      href={href}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                      title={isDxf ? "DXF Viewer ile aç" : "Dosyayı indir/aç"}
                                    >
                                      <Eye className="w-4 h-4" />
                                      {f.original_name}
                                      {isDxf ? <span className="text-xs text-gray-500">(Viewer)</span> : null}
                                    </a>
                                  ); }
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleStartOperation(operation)}
                        disabled={
                          actionLoading === operation.id || !!activeOperation || !canStartOperation(operation) 
                        }
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      >
                        <Play className="w-5 h-5" />
                        Başlat
                      </button>
                      {!canStartOperation(operation) && (
                        <p className="mt-2 text-xs text-red-600">
                          Bu operasyon şu anda başlatılamaz. Önceki operasyon(lar) tamamlanmamış.
                        </p>
                      )}

                      {activeOperation && (
                        <p className="mt-2 text-xs text-yellow-600">
                          Şu anda başka bir operasyon devam ediyor.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
