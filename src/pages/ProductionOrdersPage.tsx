import { useState, useEffect } from 'react';
import { ClipboardList, ChevronRight } from 'lucide-react';
import { getProductionOrders, getWorkOrders, updateProductionOrderStatus } from '../services/orderService';
import type { ProductionOrder, WorkOrder } from '../types/database';

export function ProductionOrdersPage() {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    if (selectedOrder) {
      loadWorkOrders(selectedOrder.id);
    }
  }, [selectedOrder]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await getProductionOrders();
      setOrders(data);
    } catch (error) {
      console.error('Üretim emirleri yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWorkOrders = async (productionOrderId: string) => {
    try {
      const data = await getWorkOrders(productionOrderId);
      setWorkOrders(data);
    } catch (error) {
      console.error('İş emirleri yüklenemedi:', error);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: ProductionOrder['status']) => {
    try {
      await updateProductionOrderStatus(orderId, newStatus);
      loadOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    } catch (error) {
      console.error('Durum güncellenemedi:', error);
      alert('Durum güncellenirken bir hata oluştu.');
    }
  };

  const getStatusColor = (status: ProductionOrder['status']) => {
    const colors = {
      'Waiting': 'bg-gray-100 text-gray-800',
      'In Progress': 'bg-yellow-100 text-yellow-800',
      'Completed': 'bg-green-100 text-green-800',
      'Cancelled': 'bg-red-100 text-red-800',
    };
    return colors[status] || colors.Waiting;
  };

  const getStatusText = (status: ProductionOrder['status']) => {
    const texts = {
      'Waiting': 'Bekliyor',
      'In Progress': 'Devam Ediyor',
      'Completed': 'Tamamlandı',
      'Cancelled': 'İptal Edildi',
    };
    return texts[status] || status;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-4">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Üretim Emirleri</h1>
        <p className="text-gray-600 mt-1">Üretim emirlerini görüntüleyin ve yönetin</p>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <ClipboardList className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz üretim emri yok</h3>
          <p className="text-gray-600">Kalıp sayfasından yeni üretim emri oluşturun</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                    <h3 className="font-semibold text-gray-900">{order.order_number}</h3>
                    <p className="text-sm text-gray-600">{order.die?.die_number}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                  {getStatusText(order.status)}
                </span>
              </div>
            ))}
          </div>

          <div className="lg:col-span-2">
            {selectedOrder ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedOrder.order_number}</h2>
                    <p className="text-gray-600 mt-1">Kalıp: {selectedOrder.die?.die_number}</p>
                  </div>
                  <span className={`px-4 py-2 rounded-lg text-sm font-medium ${getStatusColor(selectedOrder.status)}`}>
                    {getStatusText(selectedOrder.status)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Kalıp Tipi</p>
                    <p className="font-medium text-gray-900">{selectedOrder.die?.die_type}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Kalıp Çapı</p>
                    <p className="font-medium text-gray-900">{selectedOrder.die?.die_diameter_mm} mm</p>
                  </div>
                </div>

                {selectedOrder.status === 'Waiting' && (
                  <div className="mb-6">
                    <button
                      onClick={() => handleStatusChange(selectedOrder.id, 'In Progress')}
                      className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Üretime Başla
                    </button>
                  </div>
                )}

                {selectedOrder.status === 'In Progress' && (
                  <div className="mb-6 flex gap-3">
                    <button
                      onClick={() => handleStatusChange(selectedOrder.id, 'Completed')}
                      className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      Tamamla
                    </button>
                    <button
                      onClick={() => handleStatusChange(selectedOrder.id, 'Cancelled')}
                      className="px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                    >
                      İptal Et
                    </button>
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">İş Emirleri</h3>
                  {workOrders.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">İş emri bulunamadı</p>
                  ) : (
                    <div className="space-y-3">
                      {workOrders.map((wo) => (
                        <div key={wo.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-medium text-gray-900">{wo.order_number}</h4>
                              <p className="text-sm text-gray-600">{wo.die_component?.component_type?.name}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(wo.status)}`}>
                              {getStatusText(wo.status)}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-gray-600">Teorik Tüketim:</span>
                              <span className="ml-2 font-medium text-gray-900">{wo.theoretical_consumption_kg.toFixed(2)} kg</span>
                            </div>
                            {wo.actual_consumption_kg && (
                              <div>
                                <span className="text-gray-600">Gerçek Tüketim:</span>
                                <span className="ml-2 font-medium text-gray-900">{wo.actual_consumption_kg.toFixed(2)} kg</span>
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
                <p className="text-gray-500">Detayları görmek için bir üretim emri seçin</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
