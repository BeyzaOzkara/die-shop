import { useState, useEffect } from 'react';
import { ClipboardList, ChevronRight, Eye, Search, Filter } from 'lucide-react';
import {
  getProductionOrders,
  getWorkOrders,
  updateProductionOrderStatus,
  createWorkOrders,
} from '../services/orderService';
// import { createWorkOrders } from '../services/dieService';
import { getDieTypes } from '../services/masterDataService';
import type { ProductionOrder, WorkOrder, DieType } from '../types/database';
import { mediaUrl } from "../lib/media";
import { OperationPlanningModal } from "../components/OperationPlanningModal";
import { DateDisplay } from '../components/common/DateDisplay';

const VIEWER_BASE = import.meta.env.VITE_DXF_VIEWER_BASE_URL ?? "/dxf-viewer";//"http://arslan:8082";

const dxfViewerUrl = (fileUrl: string) => {
  return `${VIEWER_BASE}/?file=${encodeURIComponent(fileUrl)}`;
};

export function ProductionOrdersPage() {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [dieTypes, setDieTypes] = useState<DieType[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusBusy, setStatusBusy] = useState(false);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProductionOrder['status'] | 'All'>('All');

  // Modal State
  const [planningModal, setPlanningModal] = useState<{ isOpen: boolean; orderId: number | null }>({
    isOpen: false,
    orderId: null,
  });

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    if (selectedOrder) {
      setWorkOrders([]); // önce temizle
      loadWorkOrders(selectedOrder.id); // id: number
    } else {
      setWorkOrders([]);
    }
  }, [selectedOrder]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const [ordersData, dieTypesData] = await Promise.all([
        getProductionOrders(),
        getDieTypes(),
      ]);
      setOrders(ordersData);
      setDieTypes(dieTypesData);
    } catch (error) {
      console.error('Üretim emirleri yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWorkOrders = async (productionOrderId: number) => {
    try {
      const data = await getWorkOrders(String(productionOrderId));
      setWorkOrders(data);
    } catch (error) {
      console.error('İş emirleri yüklenemedi:', error);
    }
  };

  const handlePlanConfirm = async (selectedOperations: Record<number, number[]>) => {
    if (!planningModal.orderId) return;
    setStatusBusy(true);

    try {
      // 1) İş emirlerini seçili operasyonlarla oluştur
      await createWorkOrders(planningModal.orderId, selectedOperations);

      // 2) Load orders to reflect status change if needed (backend changes PO status automatically)
      //    Wait a bit or reload order specific data

      // Update UI
      setPlanningModal({ isOpen: false, orderId: null });
      await loadOrders(); // Refresh list to update status colors if impacted
      if (selectedOrder && selectedOrder.id === planningModal.orderId) {
        // Refresh work orders for selected
        await loadWorkOrders(planningModal.orderId);
        // Manually update selected order status to InProgress for immediate feedback
        setSelectedOrder({ ...selectedOrder, status: 'InProgress' });
      }

    } catch (error) {
      console.error("Planlama hatası:", error);
      alert("Planlama ve iş emri oluşturma sırasında bir hata oluştu.");
    } finally {
      setStatusBusy(false);
    }
  };

  const handleStatusChange = async ( // 
    order: ProductionOrder,
    newStatus: ProductionOrder['status']
  ) => {
    if (statusBusy) return;
    setStatusBusy(true);
    try {
      await updateProductionOrderStatus(String(order.id), newStatus);
      if (newStatus === 'InProgress') { // üretim emrine onay verildiğinde iş emirlerini oluştur
        // await createWorkOrders(order.id);//, order.die_id);
        await loadWorkOrders(order.id);
      }

      await loadOrders();
      if (selectedOrder?.id === order.id) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    } catch (error) {
      console.error('Durum güncellenemedi:', error);
      alert('Durum güncellenirken bir hata oluştu.');
    } finally {
      setStatusBusy(false);
    }
  };

  const getStatusColor = (status: ProductionOrder['status']) => {
    const colors = {
      Waiting: 'bg-gray-100 text-gray-800',
      'InProgress': 'bg-yellow-100 text-yellow-800',
      Completed: 'bg-green-100 text-green-800',
      Cancelled: 'bg-red-100 text-red-800',
    } as const;
    return colors[status] || colors.Waiting;
  };

  const getStatusText = (status: ProductionOrder['status']) => {
    const texts = {
      Waiting: 'Bekliyor',
      'InProgress': 'Devam Ediyor',
      Completed: 'Tamamlandı',
      Cancelled: 'İptal Edildi',
    } as const;
    return texts[status] || status;
  };

  // 🔹 Kalıp tipinin adını die_type_id üzerinden bul
  const getDieTypeName = (order: ProductionOrder) => {
    const die = order.die;
    if (!die) return '-';

    // 1) Eğer bu endpoint ileride die_type_ref döndürmeye başlarsa
    const asAny = die as any;
    if (asAny.die_type_ref?.name) {
      return asAny.die_type_ref.name;
    }
    if (typeof asAny.die_type === 'string') {
      return asAny.die_type;
    }

    // 2) Şu an elimizde olan: die_type_id
    if (die.die_type_id != null) {
      const dt = dieTypes.find((t) => t.id === die.die_type_id);
      if (dt) return dt.name;
    }

    return '-';
  };

  // Filter Logic
  const filteredOrders = orders.filter(order => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      order.order_number.toLowerCase().includes(searchLower) ||
      order.die?.die_number.toLowerCase().includes(searchLower);

    const matchesStatus = statusFilter === 'All' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <p className="text-gray-600 mt-4">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Üretim Emirleri</h1>
          <p className="text-gray-600 mt-1">
            Üretim emirlerini görüntüleyin ve yönetin
          </p>
        </div>

      {/* {orders.length === 0 ? ( */}
      {/* Filters */}
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Emir No, Kalıp No..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          <div className="relative min-w-[140px]">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm appearance-none bg-white"
            >
              <option value="All">Tüm Durumlar</option>
              <option value="Waiting">Bekliyor</option>
              <option value="InProgress">Devam Ediyor</option>
              <option value="Completed">Tamamlandı</option>
              <option value="Cancelled">İptal Edildi</option>
            </select>
          </div>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <ClipboardList className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {orders.length === 0 ? "Henüz üretim emri yok" : "Arama sonucu bulunamadı"}
          </h3>
          <p className="text-gray-600">  
          {orders.length === 0 ? "Kalıp sayfasından yeni üretim emri oluşturun" : "Filtreleri değiştirmeyi deneyin"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sol: Üretim Emirleri Listesi */}
          <div className="lg:col-span-1 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className={`bg-white rounded-lg shadow-sm border-2 p-4 cursor-pointer transition-all ${selectedOrder?.id === order.id
                    ? 'border-blue-500 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {order.order_number}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {order.die?.die_number}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
                <div className="flex justify-between items-center mb-2">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                    order.status
                  )}`}
                >
                  {getStatusText(order.status)}
                  </span>
                  <DateDisplay date={order.created_at} showTime={false} className="text-xs text-gray-400" />
                </div>
              </div>
            ))}
          </div>

          {/* Sağ: Detay ve İş Emirleri */}
          <div className="lg:col-span-2">
            {selectedOrder ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {selectedOrder.order_number}
                    </h2>
                    <p className="text-gray-600 mt-1">
                      Kalıp: {selectedOrder.die?.die_number}
                    </p>
                  </div>

                  <span
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${getStatusColor(
                      selectedOrder.status
                    )}`}
                  >
                    {getStatusText(selectedOrder.status)}
                  </span>
                </div>
                
                {selectedOrder?.die?.files?.length ? (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Kalıp Dosyaları</h3>
                    <div className="text-sm space-y-1">
                      {selectedOrder.die.files.map((f) => {
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
                ): null}

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Kalıp Tipi</p>
                    <p className="font-medium text-gray-900">
                      {getDieTypeName(selectedOrder)}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Kalıp Çapı</p>
                    <p className="font-medium text-gray-900">
                      {selectedOrder.die?.die_diameter_mm} mm
                    </p>
                  </div>

                  {/* Timestamps */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Oluşturulma</p>
                    <DateDisplay date={selectedOrder.created_at} className="font-medium text-gray-900" />
                  </div>
                  {(selectedOrder.started_at || selectedOrder.completed_at) && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">
                        {selectedOrder.completed_at ? "Tamamlanma" : "Başlama"}
                      </p>
                      <DateDisplay
                        date={selectedOrder.completed_at || selectedOrder.started_at}
                        className="font-medium text-gray-900"
                      />
                    </div>
                  )}
                </div>

                {selectedOrder.status === 'Waiting' && workOrders.length === 0 && (
                  <div className="mb-6">
                    <button
                      onClick={() => // handleStatusChange(selectedOrder, 'InProgress') - Eski davranış
                        setPlanningModal({ isOpen: true, orderId: selectedOrder.id }) // Yeni modal flow
                      }
                      className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Üretim Onayı Ver ve Planla
                    </button>
                  </div>
                )}

                {selectedOrder.status === 'InProgress' && (
                  <div className="mb-6 flex gap-3">
                    <button
                      onClick={() =>
                        handleStatusChange(selectedOrder, 'Completed')
                      }
                      className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      Tamamla
                    </button>
                    <button
                      onClick={() =>
                        handleStatusChange(selectedOrder, 'Cancelled')
                      }
                      className="px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                    >
                      İptal Et
                    </button>
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    İş Emirleri  Operasyon Özetleri
                  </h3>
                  {workOrders.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      İş emri bulunamadı
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {workOrders.map((wo) => {
                        return(
                        <div
                          key={wo.id}
                          className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-medium text-gray-900">
                                {wo.order_number}
                              </h4>
                              <p className="text-sm text-gray-600">
                                {wo.die_component?.component_type?.name}
                              </p>
                            </div>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                wo.status as ProductionOrder['status']
                              )}`}
                            >
                              {getStatusText(
                                wo.status as ProductionOrder['status']
                              )}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-gray-600">
                                Teorik Tüketim:
                              </span>
                              <span className="ml-2 font-medium text-gray-900">
                                {wo.theoretical_consumption_kg.toFixed(2)} kg
                              </span>
                            </div>
                            {wo.actual_consumption_kg && (
                              <div>
                                <span className="text-gray-600">
                                  Gerçek Tüketim:
                                </span>
                                <span className="ml-2 font-medium text-gray-900">
                                  {wo.actual_consumption_kg.toFixed(2)} kg
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="text-xs text-gray-500 flex gap-3 border-t border-gray-100 pt-2 mt-2">
                              <span>
                                Oluşturulma: <DateDisplay date={wo.created_at} showTime={true} />
                              </span>
                              {wo.completed_at && (
                                <span>
                                  Bitiş: <DateDisplay date={wo.completed_at} showTime={true} />
                                </span>
                              )}
                            </div>
                        </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <p className="text-gray-500">
                  Detayları görmek için bir üretim emri seçin
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      {planningModal.orderId && (
        <OperationPlanningModal
          isOpen={planningModal.isOpen}
          productionOrderId={planningModal.orderId}
          onClose={() => setPlanningModal({ isOpen: false, orderId: null })}
          onConfirm={handlePlanConfirm}
          loading={statusBusy}
        />
      )}
    </div>
  );
}
