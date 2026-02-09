// src/pages/operator/WorkCenterQueuePage.tsx
import { useEffect, useMemo, useState } from 'react';
import {
  LogOut,
  RefreshCw,
  Play,
  Pause,
  Check,
  Clock,
  AlertCircle,
  Eye,
  Download,
  Filter,
  X,
  ListTodo,
  Factory,
  Ban,
} from 'lucide-react';
import {
  getAvailableOperationsForOperator,
  getAssignedOperationsByWorkCenter,            // ✅ NEW
  getEligibleWorkCentersForOperator,            // ✅ NEW (senin endpoint)
  startOperation,
  pauseOperation,
  completeOperation,
  cancelOperation,                              // ✅ NEW: zaten service’te var
  
  getAvailableLotsForOperation,
  completeSawOperation,
} from '../../services/operatorService';

import type {
  Operator,
  WorkOrderOperation,
  OperationType,
  EligibleWorkCenterRead,
  Lot,
} from '../../types/database';
import { ApiError } from '../../lib/api';
import { mediaUrl } from '../../lib/media';

interface WorkCenterQueuePageProps {
  operator: Operator;
  onLogout: () => void;
}

const VIEWER_BASE =
  import.meta.env.VITE_DXF_VIEWER_BASE_URL ?? '/dxf-viewer'; // "http://arslan:8082";

const dxfViewerUrl = (fileUrl: string) => {
  return `${VIEWER_BASE}/?file=${encodeURIComponent(fileUrl)}`;
};

type TabKey = 'available' | 'assigned';

export function WorkCenterQueuePage({ operator, onLogout }: WorkCenterQueuePageProps) {
  const [tab, setTab] = useState<TabKey>('available');

  // ✅ Available ops
  const [operations, setOperations] = useState<WorkOrderOperation[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ Assigned ops by WC
  const [assignedByWc, setAssignedByWc] = useState<Record<number, WorkOrderOperation[]>>({});
  const [assignedLoading, setAssignedLoading] = useState(false);

  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [error, setError] = useState('');

  // Modal state
  const [selectedOperation, setSelectedOperation] = useState<WorkOrderOperation | null>(null);
  const [selectedWorkCenterId, setSelectedWorkCenterId] = useState<number | null>(null);

  // ✅ operator work centers artık stale olmasın diye — operations/types/WC listeleri API’den beslenecek
  // Ama operator objesi içinde work_centers geliyorsa bunu sadece "hangi WC’lere yetkisi var" için kullanıyoruz.
  const operatorWorkCenters = operator.work_centers ?? [];

  // ---------- Operation Types (filter) ----------
  // Bu listeyi, eligible WC endpoint’inden değil; operator.work_centers içindeki operation_types’dan çıkarıyoruz.
  // (Eğer operator objesini artık work_centers ile dönmeyi bırakacaksan, ayrıca "operator/{id}" çağırıp doldurman gerekir.)
  const operationTypes: OperationType[] = useMemo(() => {
    const all = operatorWorkCenters.flatMap((wc) => wc.operation_types ?? []);
    const uniq = all.filter((ot, idx) => all.findIndex((x) => x.id === ot.id) === idx);
    return uniq;
  }, [operatorWorkCenters]);

  const [selectedOperationTypeId, setSelectedOperationTypeId] = useState<number | null>(
    operationTypes?.[0]?.id ?? null
  );

  const SAW_OPERATION_TYPE_ID = 33;

  const [showSawCompleteModal, setShowSawCompleteModal] = useState(false);
  const [sawTargetOperation, setSawTargetOperation] = useState<WorkOrderOperation | null>(null);

  const [lotsLoading, setLotsLoading] = useState(false);
  const [lotsError, setLotsError] = useState('');
  const [availableLots, setAvailableLots] = useState<Lot[]>([]);
  const [selectedLotId, setSelectedLotId] = useState<number | null>(null);
  const [cutKg, setCutKg] = useState<string>(''); // input string

  const isSawOperation = (op: WorkOrderOperation) => {
    // En neti: operation_type_id
    if (op.operation_type_id === SAW_OPERATION_TYPE_ID) return true;

    // fallback (bazı payloadlarda nested olabilir)
    const name = (op.operation_type?.name ?? op.operation_name ?? '').toLowerCase();
    return name.includes('testere');
  };



  useEffect(() => {
    const first = operationTypes?.[0]?.id ?? null;
    setSelectedOperationTypeId((prev) => (prev ?? first));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operationTypes.length, operator.id]);

  // ---------- Load Available Operations ----------
  const loadOperations = async (silent = false) => {
    if (!selectedOperationTypeId) {
      setOperations([]);
      setLoading(false);
      return;
    }

    try {
      setError('');
      if (!silent) setLoading(true);

      const data = await getAvailableOperationsForOperator({
        operator_id: operator.id,
        operation_type_id: selectedOperationTypeId,
      });
      setOperations(data);
    } catch (err) {
      console.error('Operasyonlar yüklenemedi:', err);
      setError('Operasyonlar yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // ---------- Load Assigned Ops (by each WC) ----------
  const loadAssigned = async (silent = false) => {
    if (operatorWorkCenters.length === 0) {
      setAssignedByWc({});
      setAssignedLoading(false);
      return;
    }
    try {
      setError('');
      if (!silent) setAssignedLoading(true);

      const results = await Promise.all(
        operatorWorkCenters.map(async (wc) => {
          const ops = await getAssignedOperationsByWorkCenter(wc.id);
          return [wc.id, ops] as const;
        })
      );

      const map: Record<number, WorkOrderOperation[]> = {};
      for (const [wcId, ops] of results) map[wcId] = ops;
      setAssignedByWc(map);
    } catch (err) {
      console.error('Atanmış operasyonlar yüklenemedi:', err);
      setError('Atanmış operasyonlar yüklenirken bir hata oluştu');
    } finally {
      setAssignedLoading(false);
    }
  };

  // Available list refresh interval (tab’dan bağımsız kalsın)
  useEffect(() => {
    loadOperations();
    const interval = setInterval(() => loadOperations(true), 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOperationTypeId, operator.id]);

  // Assigned list refresh interval (özellikle operatör aksiyonlarında sürekli güncel olmalı)
  useEffect(() => {
    loadAssigned();
    const interval = setInterval(() => loadAssigned(true), 20000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operator.id, operatorWorkCenters.length]);

  // ---------- Eligible Work Centers (modal) ----------
  // “Available olmayanları da dön ama disabled göster” kararı için:
  // backend endpoint: GET /.../eligible-work-centers?operation_type_id=...
  const [eligibleWorkCenters, setEligibleWorkCenters] = useState<EligibleWorkCenterRead[]>([]);
  const [eligibleLoading, setEligibleLoading] = useState(false);

  const loadEligibleWorkCenters = async (opTypeId: number) => {
    try {
      setEligibleLoading(true);
      const list = await getEligibleWorkCentersForOperator(operator.id, opTypeId);
      setEligibleWorkCenters(list);
    } catch (e) {
      console.error('Eligible WC listesi alınamadı:', e);
      setEligibleWorkCenters([]);
    } finally {
      setEligibleLoading(false);
    }
  };

  // op type değişince eligible wc’leri çek
  useEffect(() => {
    if (selectedOperationTypeId) loadEligibleWorkCenters(selectedOperationTypeId);
    else setEligibleWorkCenters([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOperationTypeId, operator.id]);

  const openStartModal = (op: WorkOrderOperation) => {
    setSelectedOperation(op);

    // default: ilk Available olanı seç
    const firstAvailable = eligibleWorkCenters.find((x) => x.status === 'Available');
    setSelectedWorkCenterId(firstAvailable?.id ?? null);
  };

  const closeStartModal = () => {
    setSelectedOperation(null);
    setSelectedWorkCenterId(null);
  };

  const refreshAll = async () => {
    await Promise.all([loadOperations(true), loadAssigned(true)]);
    if (selectedOperationTypeId) await loadEligibleWorkCenters(selectedOperationTypeId);
  };

  const handleStartFromModal = async () => {
    if (!selectedOperation || !selectedWorkCenterId) return;

    try {
      setActionLoading(selectedOperation.id);

      await startOperation(selectedOperation.id, selectedWorkCenterId, operator.name);

      // Available listesinden düşür (unassigned + waiting listesiydi)
      setOperations((prev) => prev.filter((x) => x.id !== selectedOperation.id));

      closeStartModal();
      await refreshAll(); // ✅ WC statusları ve assigned queue güncellensin
    } catch (err: any) {
      console.error('Operasyon başlatılamadı:', err);
      if (err instanceof ApiError) alert(err.message);
      else alert('Operasyon başlatılırken bir hata oluştu');
    } finally {
      setActionLoading(null);
    }
  };

  // Assigned tab: Start/Resume
  const handleStartAssigned = async (op: WorkOrderOperation, workCenterId: number) => {
    try {
      setActionLoading(op.id);
      await startOperation(op.id, workCenterId, operator.name);
      await refreshAll();
    } catch (err: any) {
      console.error('Operasyon başlatılamadı:', err);
      if (err instanceof ApiError) alert(err.message);
      else alert('Operasyon başlatılırken bir hata oluştu');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePauseOperation = async (op: WorkOrderOperation) => {
    if (!confirm('Bu operasyonu duraklatmak istediğinizden emin misiniz?')) return;

    try {
      setActionLoading(op.id);
      await pauseOperation(op.id);
      await refreshAll();
    } catch (err: any) {
      console.error('Operasyon duraklatılamadı:', err);
      alert('Operasyon duraklatılırken bir hata oluştu');
    } finally {
      setActionLoading(null);
    }
  };

  const openSawCompleteModal = async (op: WorkOrderOperation) => {
  setSawTargetOperation(op);
  setShowSawCompleteModal(true);
  setLotsError('');
  setAvailableLots([]);
  setSelectedLotId(null);
  setCutKg('');

  try {
    setLotsLoading(true);
    const lots = await getAvailableLotsForOperation(op.id);
    setAvailableLots(lots);

    // default: ilk lotu seç
    setSelectedLotId(lots?.[0]?.id ?? null);
  } catch (err) {
    console.error(err);
    setLotsError('Lot listesi alınamadı.');
  } finally {
    setLotsLoading(false);
  }
};

const closeSawCompleteModal = () => {
  setShowSawCompleteModal(false);
  setSawTargetOperation(null);
  setAvailableLots([]);
  setSelectedLotId(null);
  setCutKg('');
  setLotsError('');
};

  const handleCompleteOperation = async (op: WorkOrderOperation) => {
    // TESTERE ise modal
    if (isSawOperation(op)) {
      await openSawCompleteModal(op);
      return;
    }

    if (!confirm('Bu operasyonu tamamlamak istediğinizden emin misiniz?')) return;

    try {
      setActionLoading(op.id);
      await completeOperation(op.id);
      await refreshAll();
      alert('Operasyon başarıyla tamamlandı!');
    } catch (err: any) {
      console.error('Operasyon tamamlanamadı:', err);
      alert('Operasyon tamamlanırken bir hata oluştu');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelOperation = async (op: WorkOrderOperation) => {
    if (!confirm('Bu operasyonu iptal etmek istediğinizden emin misiniz?')) return;

    try {
      setActionLoading(op.id);
      await cancelOperation(op.id);
      await refreshAll();
      alert('Operasyon iptal edildi.');
    } catch (err: any) {
      console.error('Operasyon iptal edilemedi:', err);
      alert('Operasyon iptal edilirken bir hata oluştu');
    } finally {
      setActionLoading(null);
    }
  };

  const submitSawComplete = async () => {
  if (!sawTargetOperation) return;
  if (!selectedLotId) {
    alert('Lütfen bir lot seçin.');
    return;
  }

  const kg = Number(String(cutKg).replace(',', '.'));
  if (!Number.isFinite(kg) || kg <= 0) {
    alert('Kesilen kilo geçersiz.');
    return;
  }

  // UI validation: remaining_kg kontrolü (backend zaten kontrol ediyor)
  const lot = availableLots.find((x) => x.id === selectedLotId);
  if (lot && typeof lot.remaining_kg === 'number' && kg > lot.remaining_kg) {
    alert(`Bu lotta yeterli miktar yok. Kalan: ${lot.remaining_kg} kg`);
    return;
  }

  try {
    setActionLoading(sawTargetOperation.id);

    await completeSawOperation(sawTargetOperation.id, {
      lot_id: selectedLotId,
      quantity_kg: kg,
    });

    // listeden düşür (Completed oldu)
    setOperations((prev) => prev.filter((x) => x.id !== sawTargetOperation.id));

    closeSawCompleteModal();
    alert('Testere operasyonu tamamlandı. Stok düşümü işlendi.');
    await refreshAll();
  } catch (err: any) {
    console.error(err);
    if (err instanceof ApiError) alert(err.message);
    else alert('Testere operasyonu tamamlanırken bir hata oluştu.');
  } finally {
    setActionLoading(null);
  }
};


  const waitingOperations = operations.filter((op) => op.status === 'Waiting' || op.status === 'Paused');

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

  const selectedOpType = operationTypes.find((x) => x.id === selectedOperationTypeId) ?? null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 truncate">Operatör Paneli</h1>
              <p className="text-sm text-gray-600 mt-1">
                Operatör: {operator.name}
                {operator.employee_number && ` (${operator.employee_number})`}
              </p>

              {/* Tabs */}
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => setTab('available')}
                  className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 border ${
                    tab === 'available' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200'
                  }`}
                >
                  <ListTodo className="w-4 h-4" />
                  Uygun Operasyonlar
                </button>

                <button
                  onClick={() => setTab('assigned')}
                  className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 border ${
                    tab === 'assigned' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200'
                  }`}
                >
                  <Factory className="w-4 h-4" />
                  Çalışma Merkezlerimdeki İşler
                </button>
              </div>

              {/* Filter only for Available tab */}
              {tab === 'available' && (
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Filter className="w-4 h-4" />
                    <span className="font-medium">Operasyon Tipi:</span>
                  </div>

                  <select
                    value={selectedOperationTypeId ?? ''}
                    onChange={(e) => setSelectedOperationTypeId(e.target.value ? Number(e.target.value) : null)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                  >
                    {operationTypes.length === 0 ? (
                      <option value="">(Operasyon tipi yok)</option>
                    ) : (
                      operationTypes.map((ot) => (
                        <option key={ot.id} value={ot.id}>
                          {ot.name}
                        </option>
                      ))
                    )}
                  </select>

                  {selectedOpType && (
                    <span className="text-xs text-gray-500">
                      ({eligibleWorkCenters.filter((x) => x.status === 'Available').length} Available / {eligibleWorkCenters.length} toplam WC)
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => refreshAll()}
                disabled={loading || assignedLoading}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${(loading || assignedLoading) ? 'animate-spin' : ''}`} />
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

        {/* --------- TAB: AVAILABLE --------- */}
        {tab === 'available' && (
          <>
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Uygun Operasyonlar {waitingOperations.length > 0 && `(${waitingOperations.length})`}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Seçili operasyon tipi: <span className="font-medium">{selectedOpType?.name ?? '—'}</span> · Sadece önceki adımları tamam olanlar listelenir.
              </p>
            </div>

            {waitingOperations.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Uygun operasyon yok</h3>
                <p className="text-gray-600">Bu operasyon tipi için başlatılabilir iş bulunamadı.</p>
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
                          {/* <h3 className="text-lg font-semibold text-gray-900"> */}
                            {/* {operation.operation_type?.name ?? operation.operation_name ?? 'Operasyon'}
                          </h3> */}
                          <h3 className="text-lg font-semibold text-gray-900">
                            {operation.operation_name ?? 'Operasyon'}
                          </h3>
                          <p className="text-sm text-gray-600">{operation.work_order?.order_number ?? ''}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(operation.status)}`}>
                        {getStatusText(operation.status)}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4 text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-600 shrink-0">Kalıp:</span>
                        <span className="font-medium text-gray-900 text-right">
                          {operation.work_order?.production_order?.die?.die_number ?? '—'} -{' '}
                          {operation.work_order?.die_component?.component_type?.name ?? '—'}
                        </span>
                      </div>

                      {(operation.work_order?.production_order?.die?.files?.length ?? 0) > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-xs text-gray-600 mb-2">Kalıp Dosyaları</p>

                          <div className="space-y-1 text-sm">
                            {(operation.work_order?.production_order?.die?.files ?? []).map((f) => {
                              const fileUrl = mediaUrl(f.storage_path);
                              const absoluteFileUrl = new URL(fileUrl, window.location.origin).toString();
                              const isDxf = (f.original_name ?? '').toLowerCase().endsWith('.dxf');
                              const href = isDxf ? dxfViewerUrl(absoluteFileUrl) : absoluteFileUrl;

                              return (
                                <div
                                  key={f.id}
                                  className="flex items-center justify-between gap-2"
                                >
                                  <span className="truncate text-blue-600" title={f.original_name}>
                                    {f.original_name}
                                    {isDxf ? <span className="ml-1 text-xs text-gray-500">(DXF)</span> : null}
                                  </span>

                                  <div className="flex items-center gap-2 shrink-0">
                                    {/* 👁 Görüntüle */}
                                    <a
                                      href={href}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1 rounded hover:bg-gray-100 text-gray-700 hover:text-gray-900"
                                      title={isDxf ? 'DXF Viewer ile görüntüle' : 'Görüntüle'}
                                      aria-label="Görüntüle"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </a>

                                    {/* ⬇️ İndir (her zaman gerçek dosya) */}
                                    <a
                                      href={absoluteFileUrl}
                                      download
                                      className="p-1 rounded hover:bg-gray-100 text-gray-700 hover:text-gray-900"
                                      title="İndir"
                                      aria-label="İndir"
                                    >
                                      <Download className="w-4 h-4" />
                                    </a>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => openStartModal(operation)}
                      disabled={actionLoading === operation.id || eligibleWorkCenters.length === 0 || eligibleLoading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      <Play className="w-5 h-5" />
                      Başlat (Çalışma Merkezi Seç)
                    </button>

                    {eligibleWorkCenters.length === 0 && (
                      <p className="mt-2 text-xs text-red-600">Bu operasyon tipi için uygun çalışma merkezi yok.</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* --------- TAB: ASSIGNED --------- */}
        {tab === 'assigned' && (
          <>
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Çalışma Merkezlerimdeki İşler
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Yetkili olduğunuz çalışma merkezlerinde atanmış / devam eden / duraklatılmış işleri buradan yönetirsiniz.
              </p>
            </div>

            {operatorWorkCenters.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Çalışma merkezi yok</h3>
                <p className="text-gray-600">Bu operatöre atanmış çalışma merkezi bulunmuyor.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {operatorWorkCenters.map((wc) => {
                  const ops = assignedByWc[wc.id] ?? [];
                  const activeCount = ops.filter((x) => x.status === 'InProgress').length;
                  const pausedCount = ops.filter((x) => x.status === 'Paused').length;

                  return (
                    <div key={wc.id} className="bg-white rounded-lg border border-gray-200">
                      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <div className="min-w-0">
                          <h3 className="font-bold text-gray-900 truncate">{wc.name}</h3>
                          <p className="text-xs text-gray-500 mt-1">
                            Atanmış iş: {ops.length} · InProgress: {activeCount} · Paused: {pausedCount}
                          </p>
                        </div>

                        <div className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                          Durum: {String(wc.status)}
                        </div>
                      </div>

                      {ops.length === 0 ? (
                        <div className="p-5 text-sm text-gray-600">Bu çalışma merkezinde atanmış iş yok.</div>
                      ) : (
                        <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-3">
                          {ops.map((op) => (
                            <div key={op.id} className="border border-gray-200 rounded-lg p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-gray-700 font-semibold text-sm">
                                      {op.sequence_number}
                                    </span>
                                    {/* <h4 className="font-semibold text-gray-900 truncate">
                                      {op.operation_type?.name ?? op.operation_name ?? 'Operasyon'}
                                    </h4> */}
                                    <h4 className="font-semibold text-gray-900 truncate">
                                      {op.operation_name ?? 'Operasyon'}
                                    </h4>
                                    <p className="text-[11px] text-gray-500 truncate">
                                      Tip: {op.operation_type?.name ?? '—'}
                                    </p>
                                  </div>
                                  <p className="text-xs text-gray-600 mt-1 truncate">
                                    {op.work_order?.order_number ?? ''}
                                  </p>
                                </div>

                                <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(op.status)}`}>
                                  {getStatusText(op.status)}
                                </span>
                              </div>

                              <div className="mt-3 text-xs text-gray-600 space-y-1">
                                <div className="flex justify-between gap-2">
                                  <span>Kalıp</span>
                                  <span className="font-medium text-gray-900">
                                    {op.work_order?.production_order?.die?.die_number ?? '—'}
                                  </span>
                                </div>
                                <div className="flex justify-between gap-2">
                                  <span>Bileşen</span>
                                  <span className="font-medium text-gray-900">
                                    {op.work_order?.die_component?.component_type?.name ?? '—'}
                                  </span>
                                </div>
                              </div>

                              <div className="mt-4 flex flex-wrap gap-2">
                                {(op.status === 'Waiting' || op.status === 'Paused') && (
                                  <button
                                    onClick={() => handleStartAssigned(op, wc.id)}
                                    disabled={actionLoading === op.id}
                                    className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:bg-gray-300 flex items-center gap-2"
                                  >
                                    <Play className="w-4 h-4" />
                                    {op.status === 'Paused' ? 'Devam Et' : 'Başlat'}
                                  </button>
                                )}

                                {op.status === 'InProgress' && (
                                  <button
                                    onClick={() => handlePauseOperation(op)}
                                    disabled={actionLoading === op.id}
                                    className="px-3 py-2 rounded-lg bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 disabled:bg-gray-300 flex items-center gap-2"
                                  >
                                    <Pause className="w-4 h-4" />
                                    Duraklat
                                  </button>
                                )}

                                {(op.status === 'InProgress' || op.status === 'Paused') && (
                                  <>
                                    <button
                                      onClick={() => handleCompleteOperation(op)}
                                      disabled={actionLoading === op.id}
                                      className="px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:bg-gray-300 flex items-center gap-2"
                                    >
                                      <Check className="w-4 h-4" />
                                      Tamamla
                                    </button>

                                    <button
                                      onClick={() => handleCancelOperation(op)}
                                      disabled={actionLoading === op.id}
                                      className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:bg-gray-300 flex items-center gap-2"
                                    >
                                      <Ban className="w-4 h-4" />
                                      İptal
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {/* --------- Start Modal (Available tab) --------- */}
      {selectedOperation && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Operasyonu Başlat</h3>
                <p className="text-sm text-gray-600">
                  {selectedOperation.operation_name ?? 'Operasyon'}  ·  {selectedOperation.work_order?.order_number ?? ''}
                </p>
              </div>
              <button
                onClick={closeStartModal}
                className="p-2 rounded-lg hover:bg-gray-100"
                aria-label="Kapat"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="px-5 py-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Çalışma Merkezi Seç</label>

              <select
                value={selectedWorkCenterId ?? ''}
                onChange={(e) => setSelectedWorkCenterId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
              >
                {eligibleWorkCenters.length === 0 ? (
                  <option value="">(Uygun çalışma merkezi yok)</option>
                ) : (
                  eligibleWorkCenters.map((wc) => (
                    <option key={wc.id} value={wc.id} disabled={wc.status !== 'Available'}>
                      {wc.name} {wc.status !== 'Available' ? `— (${wc.status})` : ''}
                    </option>
                  ))
                )}
              </select>

              <div className="mt-3 text-xs text-gray-500">
                Tüm uygun çalışma merkezleri listelenir. “Available” olmayanlar seçilemez (disabled) görünür.
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={closeStartModal}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                disabled={actionLoading === selectedOperation.id}
              >
                Vazgeç
              </button>
              <button
                onClick={handleStartFromModal}
                disabled={actionLoading === selectedOperation.id || !selectedWorkCenterId}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {actionLoading === selectedOperation.id ? 'Başlatılıyor...' : 'Başlat'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSawCompleteModal && sawTargetOperation && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
    <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-gray-200">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Testere Operasyonu Bitir</h3>
          <p className="text-sm text-gray-600">
            {sawTargetOperation.work_order?.order_number ?? ''} ·{' '}
            {sawTargetOperation.operation_type?.name ?? sawTargetOperation.operation_name ?? 'TESTERE'}
          </p>
        </div>
        <button
          onClick={closeSawCompleteModal}
          className="p-2 rounded-lg hover:bg-gray-100"
          aria-label="Kapat"
          disabled={actionLoading === sawTargetOperation.id}
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <div className="px-5 py-4 space-y-4">
        {lotsError && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            <AlertCircle className="w-5 h-5" />
            <span>{lotsError}</span>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Hangi Lot?</label>

          <select
            value={selectedLotId ?? ''}
            onChange={(e) => setSelectedLotId(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
            disabled={lotsLoading}
          >
            {lotsLoading ? (
              <option value="">Lotlar yükleniyor...</option>
            ) : availableLots.length === 0 ? (
              <option value="">(Uygun lot yok)</option>
            ) : (
              availableLots.map((lot) => (
                // <option key={lot.id} value={lot.id}>
                //   #{lot.certificate_number} · {lot.supplier} · Kalan {lot.remaining_kg} kg
                // </option>
                <option key={lot.id} value={lot.id}>
                  Ø{(lot as any).diameter_mm ?? '—'} · {lot.supplier} · Kalan {lot.remaining_kg} kg
                </option>

              ))
            )}
          </select>

          <p className="mt-2 text-xs text-gray-500">
            Sadece ilgili çeliğe ait ve remaining_kg &gt; 0 olan lotlar listelenir.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Gerçekte kaç kg kesildi?</label>
          <input
            value={cutKg}
            onChange={(e) => setCutKg(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
            placeholder="örn: 12.5"
            inputMode="decimal"
            disabled={lotsLoading}
          />
        </div>
      </div>

      <div className="px-5 py-4 border-t border-gray-200 flex gap-3">
        <button
          onClick={closeSawCompleteModal}
          className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          disabled={actionLoading === sawTargetOperation.id}
        >
          Vazgeç
        </button>
        <button
          onClick={submitSawComplete}
          disabled={
            actionLoading === sawTargetOperation.id ||
            lotsLoading ||
            !selectedLotId ||
            !cutKg
          }
          className="flex-1 px-4 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {actionLoading === sawTargetOperation.id ? 'Kaydediliyor...' : 'Bitir & Stok Düş'}
        </button>
      </div>
    </div>
  </div>
)}

    </div>
  );
}
