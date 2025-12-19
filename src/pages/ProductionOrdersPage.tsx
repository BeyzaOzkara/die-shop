import { useState, useEffect } from 'react';
import { ClipboardList, ChevronRight, Eye } from 'lucide-react';
import {
  getProductionOrders,
  getWorkOrders,
  updateProductionOrderStatus,
} from '../services/orderService';
import { createWorkOrders } from '../services/dieService';
import { getDieTypes } from '../services/masterDataService';
import type { ProductionOrder, WorkOrder, DieType } from '../types/database';
import { mediaUrl } from "../lib/media";

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

  const handleStatusChange = async ( // 
    order: ProductionOrder,
    newStatus: ProductionOrder['status']
  ) => {
    if (statusBusy) return;
    setStatusBusy(true);
    try {
      await updateProductionOrderStatus(String(order.id), newStatus);
      if (newStatus === 'InProgress') { // üretim emrine onay verildiğinde iş emirlerini oluştur
        await createWorkOrders(order.id);//, order.die_id);
        await loadWorkOrders(order.id);
      }

      await loadOrders();
      if (selectedOrder?.id === order.id) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    } catch (error) {
      console.error('Durum güncellenemedi:', error);
      alert('Durum güncellenirken bir hata oluştu.');
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Üretim Emirleri</h1>
        <p className="text-gray-600 mt-1">
          Üretim emirlerini görüntüleyin ve yönetin
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <ClipboardList className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Henüz üretim emri yok
          </h3>
          <p className="text-gray-600">
            Kalıp sayfasından yeni üretim emri oluşturun
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sol: Üretim Emirleri Listesi */}
          <div className="lg:col-span-1 space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className={`bg-white rounded-lg shadow-sm border-2 p-4 cursor-pointer transition-all ${
                  selectedOrder?.id === order.id
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
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                    order.status
                  )}`}
                >
                  {getStatusText(order.status)}
                </span>
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
                </div>

                {selectedOrder.status === 'Waiting' && (
                  <div className="mb-6">
                    <button
                      onClick={() =>
                        handleStatusChange(selectedOrder, 'InProgress')
                      }
                      className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Üretim Onayı Ver
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
                    İş Emirleri
                  </h3>
                  {workOrders.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      İş emri bulunamadı
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {workOrders.map((wo) => (
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
                        </div>
                      ))}
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
    </div>
  );
}
