import { useState, useEffect, useRef, useCallback } from 'react';
import { Settings, Play, Check, Eye, Search, X } from 'lucide-react';
import {
  getWorkOrdersPage,
  getWorkOrderOperations,
  updateOperationStatus,
} from '../services/orderService';
import {
  getLastOperatorsForOperations,
  type LastOperatorInfo,
} from '../services/operatorService';
import type { WorkOrder, WorkOrderOperation } from '../types/database';
import { mediaUrl } from "../lib/media";

const VIEWER_BASE = import.meta.env.VITE_DXF_VIEWER_BASE_URL ?? "/dxf-viewer";
const PAGE_SIZE = 20;

const dxfViewerUrl = (fileUrl: string) =>
  `${VIEWER_BASE}/?file=${encodeURIComponent(fileUrl)}`;

export function WorkOrdersPage() {
  // ── List state ──────────────────────────────────────────────
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // ── Filters ──────────────────────────────────────────────────
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<WorkOrder['status'] | ''>('');

  // Debounced search value
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchText), 350);
    return () => clearTimeout(t);
  }, [searchText]);

  // ── Detail / operation state ─────────────────────────────────
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [operations, setOperations] = useState<WorkOrderOperation[]>([]);

  const [lastOperatorMap, setLastOperatorMap] = useState<Record<string, LastOperatorInfo>>({});

  // ── Fetch a single page ───────────────────────────────────────
  const fetchPage = useCallback(
    async (currentSkip: number, replace: boolean) => {
      setListLoading(true);
      try {
        const page = await getWorkOrdersPage({
          skip: currentSkip,
          limit: PAGE_SIZE,
          status: statusFilter || undefined,
          search: debouncedSearch || undefined,
        });
        setWorkOrders((prev) => (replace ? page : [...prev, ...page]));
        setHasMore(page.length === PAGE_SIZE);
        setSkip(currentSkip + page.length);
      } finally {
        setListLoading(false);
        if (replace) setInitialLoading(false);
      }
    },
    [statusFilter, debouncedSearch]
  );

  // ── Re-fetch from scratch when filters change ─────────────────
  useEffect(() => {
    setInitialLoading(true);
    setWorkOrders([]);
    setSkip(0);
    setHasMore(true);
    fetchPage(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, debouncedSearch]);

  // ── IntersectionObserver sentinel ─────────────────────────────
  const handleSentinel = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasMore && !listLoading) {
        fetchPage(skip, false);
      }
    },
    [hasMore, listLoading, skip, fetchPage]
  );

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(handleSentinel, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleSentinel]);

  // ── Load operations when a work order is selected ─────────────
  useEffect(() => {
    if (selectedWorkOrder) {
      loadOperations(String(selectedWorkOrder.id));
    } else {
      setOperations([]);
    }
  }, [selectedWorkOrder]);

  const loadOperations = async (workOrderId: string) => {
    try {
      const data = await getWorkOrderOperations(workOrderId);
      setOperations(data);
      if (data.length > 0) {
        const ids = data.map((op: WorkOrderOperation) => op.id);
        try {
          const map = await getLastOperatorsForOperations(ids);
          setLastOperatorMap(map);
        } catch {
          // non-critical
        }
      } else {
        setLastOperatorMap({});
      }
    } catch (error) {
      console.error('Operasyonlar yüklenemedi:', error);
    }
  };

  const handleOperationStatusChange = async (
    operationId: string,
    newStatus: WorkOrderOperation['status'],
    operatorName?: string
  ) => {
    try {
      await updateOperationStatus(operationId, newStatus, operatorName);
      if (selectedWorkOrder) {
        await loadOperations(String(selectedWorkOrder.id));
        // Refresh the card in the list so the status badge updates
        setWorkOrders((prev) =>
          prev.map((wo) =>
            wo.id === selectedWorkOrder.id
              ? { ...wo, status: newStatus === 'InProgress' ? 'InProgress' : wo.status }
              : wo
          )
        );
      }
    } catch (error: any) {
      console.error('Operasyon durumu güncellenemedi:', error);
      const msg =
        error?.response?.data?.detail ||
        error?.message ||
        'Operasyon durumu güncellenirken bir hata oluştu.';
      alert(msg);
    }
  };



  // ── UI helpers ────────────────────────────────────────────────
  type UiStatus = WorkOrder['status'] | WorkOrderOperation['status'];
  const STATUS_COLORS: Record<string, string> = {
    Waiting: 'bg-gray-100 text-gray-800',
    InProgress: 'bg-yellow-100 text-yellow-800',
    Completed: 'bg-green-100 text-green-800',
    Cancelled: 'bg-red-100 text-red-800',
    Paused: 'bg-orange-100 text-orange-800',
  };

  const STATUS_TEXT: Record<string, string> = {
    Waiting: 'Bekliyor',
    InProgress: 'Devam Ediyor',
    Completed: 'Tamamlandı',
    Cancelled: 'İptal Edildi',
    Paused: 'Duraklatıldı',
  };

  const getStatusColor = (status: UiStatus) => STATUS_COLORS[status] ?? STATUS_COLORS.Waiting;
  const getStatusText = (status: UiStatus) => STATUS_TEXT[status] ?? String(status);

  const opTitle = (op: WorkOrderOperation) => {
    const name = (op.operation_name ?? '').trim();
    return (
      name ||
      op.operation_type?.name ||
      (op.operation_type_id ? `OperationType#${op.operation_type_id}` : `Operation#${op.id}`)
    );
  };

  const getCurrentOperationText = (ops: WorkOrderOperation[]) => {
    if (ops.length === 0) return 'Operasyon tanımlı değil';
    const inProgress = ops.find((op) => op.status === 'InProgress');
    if (inProgress) return `${inProgress.sequence_number}/${ops.length} - ${opTitle(inProgress)}`;
    const nextWaiting = ops.find((op) => op.status === 'Waiting');
    if (nextWaiting) return `${nextWaiting.sequence_number}/${ops.length} - ${opTitle(nextWaiting)} (Bekliyor)`;
    return `${ops.length}/${ops.length} - Tamamlandı`;
  };

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">İş Emirleri</h1>
        <p className="text-gray-600 mt-1">İş emirlerini ve operasyonları takip edin</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol: İş Emirleri listesi */}
        <div className="lg:col-span-1 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Ara: iş emri no, kalıp no..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            />
            {searchText && (
              <button
                onClick={() => setSearchText('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as WorkOrder['status'] | '')}
            className="w-full py-2 px-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="">Tüm Durumlar</option>
            <option value="Waiting">Bekliyor</option>
            <option value="InProgress">Devam Ediyor</option>
            <option value="Completed">Tamamlandı</option>
            <option value="Cancelled">İptal Edildi</option>
          </select>

          {/* List */}
          {initialLoading ? (
            <div className="py-12 text-center">
              <div className="inline-block animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600" />
              <p className="text-gray-500 mt-3 text-sm">Yükleniyor...</p>
            </div>
          ) : workOrders.length === 0 && !listLoading ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
              {searchText || statusFilter ? (
                <p className="text-sm text-gray-500">Sonuç bulunamadı.</p>
              ) : (
                <>
                  <Settings className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">Henüz iş emri yok.</p>
                </>
              )}
            </div>
          ) : (
            <>
              {workOrders.map((wo) => (
                <div
                  key={wo.id}
                  onClick={() => setSelectedWorkOrder(wo)}
                  className={`bg-white rounded-lg shadow-sm border-2 p-4 cursor-pointer transition-all ${
                    selectedWorkOrder?.id === wo.id
                      ? 'border-blue-500 shadow-md'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="mb-2">
                    <h3 className="font-semibold text-gray-900">{wo.pre_machining_order_number || wo.order_number}</h3>
                    <p className="text-sm text-gray-600">
                      {wo.pre_machining_order_number ? 'Yarımamül (Ön İşleme)' : wo.die_component?.component_type?.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {wo.pre_machining_order_number ? 'Stok (Ön İşleme)' : wo.production_order?.die?.die_number}
                    </p>
                  </div>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(wo.status)}`}
                  >
                    {getStatusText(wo.status)}
                  </span>
                </div>
              ))}

              {/* Sentinel — only shown when more pages exist */}
              {hasMore && (
                <div ref={sentinelRef} className="py-4 text-center">
                  {listLoading ? (
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
                  ) : (
                    <span className="text-xs text-gray-400">Kaydırın</span>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Sağ: Detay & Operasyonlar */}
        <div className="lg:col-span-2">
          {selectedWorkOrder ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedWorkOrder.pre_machining_order_number || selectedWorkOrder.order_number}
                  </h2>
                  <p className="text-gray-600 mt-1">
                    {selectedWorkOrder.pre_machining_order_number ? 'Yarımamül (Ön İşleme)' : selectedWorkOrder.die_component?.component_type?.name}
                  </p>
                </div>
                <span
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${getStatusColor(
                    selectedWorkOrder.status
                  )}`}
                >
                  {getStatusText(selectedWorkOrder.status)}
                </span>
              </div>

              {selectedWorkOrder?.production_order?.die?.files?.length ? (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Kalıp Dosyaları
                  </h3>
                  <div className="text-sm space-y-1">
                    {selectedWorkOrder.production_order.die.files.map((f) => {
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
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">{selectedWorkOrder.pre_machining_order_number ? 'Kullanılan Stok' : 'Çelik Ürün'}</p>
                  <p className="font-medium text-gray-900">
                    {selectedWorkOrder.pre_machining_order_number ? (
                      selectedWorkOrder.stock_item?.attributes?.alloy ? `${selectedWorkOrder.stock_item.attributes.alloy} - Ø${selectedWorkOrder.stock_item.attributes.diameter_mm}mm` : '-'
                    ) : (
                      selectedWorkOrder.die_component?.stock_item?.attributes?.alloy ? `${selectedWorkOrder.die_component.stock_item.attributes.alloy} - Ø${selectedWorkOrder.die_component.stock_item.attributes.diameter_mm}mm` : '-'
                    )}
                  </p>
                </div>
                {selectedWorkOrder.pre_machining_order_number && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-blue-800 mb-1">Planlanan Kesim</p>
                    <p className="font-medium text-blue-900">
                      {selectedWorkOrder.planned_cut_length_mm} mm / {selectedWorkOrder.planned_cut_weight_kg} kg
                    </p>
                  </div>
                )}
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Teorik Tüketim</p>
                  <p className="font-medium text-gray-900">
                    {selectedWorkOrder.theoretical_consumption_kg.toFixed(2)} kg
                  </p>
                </div>
                {(selectedWorkOrder.production_order?.die as any)?.expected_completion_date && (
                  <div className="bg-amber-50 rounded-lg p-4">
                    <p className="text-sm text-amber-700 mb-1">Ön Görülen Termin</p>
                    <p className="font-medium text-amber-900">
                      {(selectedWorkOrder.production_order?.die as any).expected_completion_date}
                    </p>
                  </div>
                )}
              </div>

              {(selectedWorkOrder.production_order?.die as any)?.description && (
                <div className="mb-6 bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Açıklama</p>
                  <p className="text-gray-900 text-sm whitespace-pre-wrap">
                    {(selectedWorkOrder.production_order?.die as any).description}
                  </p>
                </div>
              )}

              {selectedWorkOrder.status !== 'Completed' && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 mb-1">Mevcut Operasyon</p>
                  <p className="text-blue-800">{getCurrentOperationText(operations)}</p>
                </div>
              )}

              {selectedWorkOrder.status === 'Completed' && selectedWorkOrder.actual_consumption_kg && (
                <div className="mb-6 p-4 bg-green-50 rounded-lg">
                  <p className="text-sm font-medium text-green-900 mb-1">Gerçek Tüketim</p>
                  <p className="text-green-800 text-lg font-semibold">
                    {selectedWorkOrder.actual_consumption_kg.toFixed(2)} kg
                  </p>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Operasyonlar</h3>
                {operations.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Operasyon bulunamadı</p>
                ) : (
                  <div className="space-y-3">
                    {operations.map((op) => (
                      <div key={op.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-xs font-semibold text-gray-700">
                                {op.sequence_number}
                              </span>
                              <h4 className="font-medium text-gray-900">{opTitle(op)}</h4>
                            </div>
                            <p className="text-sm text-gray-600">{op.work_center?.name}</p>
                            {lastOperatorMap[String(op.id)] && (
                              <p className="text-xs text-gray-500 mt-1">
                                Son Operatör: {lastOperatorMap[String(op.id)].operator_name}
                              </p>
                            )}
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(op.status)}`}
                          >
                            {getStatusText(op.status)}
                          </span>
                        </div>

                        {op.status === 'Waiting' && selectedWorkOrder.status !== 'Completed' && (
                          <button
                            onClick={() => {
                              const operator = prompt('Operatör adını girin (opsiyonel):');
                              handleOperationStatusChange(String(op.id), 'InProgress', operator || undefined);
                            }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                          >
                            <Play className="w-4 h-4" />
                            Başlat
                          </button>
                        )}

                        {op.status === 'InProgress' && (
                          <button
                            onClick={() => handleOperationStatusChange(String(op.id), 'Completed')}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                          >
                            <Check className="w-4 h-4" />
                            Tamamla
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>


            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-gray-500">Detayları görmek için bir iş emri seçin</p>
            </div>
          )}
        </div>
      </div>


    </div>
  );
}
