import { useState, useEffect } from 'react';
import { Settings, Play, Check } from 'lucide-react';
import { getWorkOrders, getWorkOrderOperations, updateOperationStatus, completeWorkOrder } from '../services/orderService';
import { getAvailableLots } from '../services/stockService';
import type { WorkOrder, WorkOrderOperation, Lot } from '../types/database';

export function WorkOrdersPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [operations, setOperations] = useState<WorkOrderOperation[]>([]);
  const [availableLots, setAvailableLots] = useState<Lot[]>([]);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [actualConsumption, setActualConsumption] = useState('');
  const [selectedLot, setSelectedLot] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkOrders();
  }, []);

  useEffect(() => {
    if (selectedWorkOrder) {
      loadOperations(String(selectedWorkOrder.id));
      if (selectedWorkOrder.die_component?.stock_item_id) {
        loadAvailableLots(String(selectedWorkOrder.die_component.stock_item_id));
      }
    }
  }, [selectedWorkOrder]);

  const loadWorkOrders = async () => {
    try {
      setLoading(true);
      const data = await getWorkOrders();
      setWorkOrders(data);
    } catch (error) {
      console.error('İş emirleri yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOperations = async (workOrderId: string) => {
    try {
      const data = await getWorkOrderOperations(workOrderId);
      setOperations(data);
    } catch (error) {
      console.error('Operasyonlar yüklenemedi:', error);
    }
  };

  const loadAvailableLots = async (stockItemId: string) => {
    try {
      const data = await getAvailableLots(stockItemId);
      setAvailableLots(data);
    } catch (error) {
      console.error('Lotlar yüklenemedi:', error);
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
        loadOperations(String(selectedWorkOrder.id));
      }
    } catch (error) {
      console.error('Operasyon durumu güncellenemedi:', error);
      alert('Operasyon durumu güncellenirken bir hata oluştu.');
    }
  };

  const handleCompleteWorkOrder = async () => {
    if (!selectedWorkOrder || !actualConsumption || !selectedLot) {
      alert('Lütfen tüm alanları doldurun.');
      return;
    }

    try {
      await completeWorkOrder(
        String(selectedWorkOrder.id),
        Number(actualConsumption),
        selectedLot
      );
      setShowCompleteModal(false);
      loadWorkOrders();
      setSelectedWorkOrder(null);
      setActualConsumption('');
      setSelectedLot('');
      alert('İş emri başarıyla tamamlandı.');
    } catch (error: any) {
      console.error('İş emri tamamlanamadı:', error);
      alert(error.message || 'İş emri tamamlanırken bir hata oluştu.');
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'Waiting': 'bg-gray-100 text-gray-800',
      'In Progress': 'bg-yellow-100 text-yellow-800',
      'Completed': 'bg-green-100 text-green-800',
    };
    return colors[status as keyof typeof colors] || colors.Waiting;
  };

  const getStatusText = (status: string) => {
    const texts = {
      'Waiting': 'Bekliyor',
      'In Progress': 'Devam Ediyor',
      'Completed': 'Tamamlandı',
    };
    return texts[status as keyof typeof texts] || status;
  };

  const getCurrentOperationText = (ops: WorkOrderOperation[]) => {
    const inProgress = ops.find(op => op.status === 'In Progress');
    if (inProgress) {
      return `${inProgress.sequence_number}/${ops.length} - ${inProgress.operation_name}`;
    }
    const nextWaiting = ops.find(op => op.status === 'Waiting');
    if (nextWaiting) {
      return `${nextWaiting.sequence_number}/${ops.length} - ${nextWaiting.operation_name} (Bekliyor)`;
    }
    return `${ops.length}/${ops.length} - Tamamlandı`;
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
        <h1 className="text-3xl font-bold text-gray-900">İş Emirleri</h1>
        <p className="text-gray-600 mt-1">İş emirlerini ve operasyonları takip edin</p>
      </div>

      {workOrders.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz iş emri yok</h3>
          <p className="text-gray-600">Üretim emri oluşturduğunuzda iş emirleri otomatik oluşturulacaktır</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
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
                  <h3 className="font-semibold text-gray-900">{wo.order_number}</h3>
                  <p className="text-sm text-gray-600">{wo.die_component?.component_type?.name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {wo.production_order?.die?.die_number}
                  </p>
                </div>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(wo.status)}`}>
                  {getStatusText(wo.status)}
                </span>
              </div>
            ))}
          </div>

          <div className="lg:col-span-2">
            {selectedWorkOrder ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedWorkOrder.order_number}</h2>
                    <p className="text-gray-600 mt-1">
                      {selectedWorkOrder.die_component?.component_type?.name}
                    </p>
                  </div>
                  <span className={`px-4 py-2 rounded-lg text-sm font-medium ${getStatusColor(selectedWorkOrder.status)}`}>
                    {getStatusText(selectedWorkOrder.status)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Çelik Ürün</p>
                    <p className="font-medium text-gray-900">
                      {selectedWorkOrder.die_component?.stock_item?.alloy} - Ø{selectedWorkOrder.die_component?.stock_item?.diameter_mm}mm
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Teorik Tüketim</p>
                    <p className="font-medium text-gray-900">{selectedWorkOrder.theoretical_consumption_kg.toFixed(2)} kg</p>
                  </div>
                </div>

                {selectedWorkOrder.status !== 'Completed' && (
                  <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-900 mb-1">Mevcut Operasyon</p>
                    <p className="text-blue-800">{getCurrentOperationText(operations)}</p>
                  </div>
                )}

                {selectedWorkOrder.status === 'Completed' && selectedWorkOrder.actual_consumption_kg && (
                  <div className="mb-6 p-4 bg-green-50 rounded-lg">
                    <p className="text-sm font-medium text-green-900 mb-1">Gerçek Tüketim</p>
                    <p className="text-green-800 text-lg font-semibold">{selectedWorkOrder.actual_consumption_kg.toFixed(2)} kg</p>
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
                                <h4 className="font-medium text-gray-900">{op.operation_name}</h4>
                              </div>
                              <p className="text-sm text-gray-600">{op.work_center?.name}</p>
                              {op.operator_name && (
                                <p className="text-xs text-gray-500 mt-1">Operatör: {op.operator_name}</p>
                              )}
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(op.status)}`}>
                              {getStatusText(op.status)}
                            </span>
                          </div>

                          {op.status === 'Waiting' && selectedWorkOrder.status !== 'Completed' && (
                            <button
                              onClick={() => {
                                const operator = prompt('Operatör adını girin (opsiyonel):');
                                handleOperationStatusChange(String(op.id), 'In Progress', operator || undefined);
                              }}
                              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                            >
                              <Play className="w-4 h-4" />
                              Başlat
                            </button>
                          )}

                          {op.status === 'In Progress' && (
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

                {selectedWorkOrder.status === 'In Progress' &&
                 operations.every(op => op.status === 'Completed') && (
                  <button
                    onClick={() => setShowCompleteModal(true)}
                    className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    İş Emrini Tamamla
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <p className="text-gray-500">Detayları görmek için bir iş emri seçin</p>
              </div>
            )}
          </div>
        </div>
      )}

      {showCompleteModal && selectedWorkOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">İş Emrini Tamamla</h3>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teorik Tüketim
                </label>
                <input
                  type="text"
                  value={`${selectedWorkOrder.theoretical_consumption_kg.toFixed(2)} kg`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gerçek Tüketim (kg) *
                </label>
                <input
                  type="number"
                  value={actualConsumption}
                  onChange={(e) => setActualConsumption(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  step="0.01"
                  min="0"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lot Seçimi *
                </label>
                <select
                  value={selectedLot}
                  onChange={(e) => setSelectedLot(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Lot seçiniz</option>
                  {availableLots.map((lot) => (
                    <option key={lot.id} value={lot.id}>
                      {lot.certificate_number} - Kalan: {lot.remaining_kg.toFixed(2)} kg
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCompleteModal(false);
                  setActualConsumption('');
                  setSelectedLot('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleCompleteWorkOrder}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Tamamla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
