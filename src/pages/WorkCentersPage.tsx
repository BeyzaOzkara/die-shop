import { useState, useEffect } from 'react';
import { Settings, Plus, Activity } from 'lucide-react';
import { getWorkCenters, createWorkCenter, updateWorkCenter } from '../services/workCenterService';
import { getOperationsByWorkCenter } from '../services/orderService';
import type { WorkCenter, WorkOrderOperation, OperationStatus } from '../types/database';

export function WorkCentersPage() {
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([]);
  const [selectedWorkCenter, setSelectedWorkCenter] = useState<WorkCenter | null>(null);
  const [operations, setOperations] = useState<WorkOrderOperation[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    type: '',
    status: 'Available' as WorkCenter['status'],
    location: '',
    capacity_per_hour: '',
    setup_time_minutes: '',
    cost_per_hour: '',
  });

  useEffect(() => {
    loadWorkCenters();
  }, []);

  useEffect(() => {
    if (selectedWorkCenter) {
      loadOperations(String(selectedWorkCenter.id));
    }
  }, [selectedWorkCenter]);

  const loadWorkCenters = async () => {
    try {
      setLoading(true);
      const data = await getWorkCenters();
      setWorkCenters(data);
    } catch (error) {
      console.error('Çalışma merkezleri yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOperations = async (workCenterId: string) => {
    try {
      const data = await getOperationsByWorkCenter(workCenterId);
      setOperations(data);
    } catch (error) {
      console.error('Operasyonlar yüklenemedi:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createWorkCenter({
        name: formData.name,
        type: formData.type,
        status: formData.status,
        location: formData.location || undefined,
        capacity_per_hour: formData.capacity_per_hour
          ? Number(formData.capacity_per_hour)
          : undefined,
        setup_time_minutes: formData.setup_time_minutes
          ? Number(formData.setup_time_minutes)
          : undefined,
        cost_per_hour: formData.cost_per_hour
          ? Number(formData.cost_per_hour)
          : undefined,
      });
      setFormData({
        name: '',
        type: '',
        status: 'Available',
        location: '',
        capacity_per_hour: '',
        setup_time_minutes: '',
        cost_per_hour: '',
      });
      setShowForm(false);
      loadWorkCenters();
    } catch (error) {
      console.error('Çalışma merkezi oluşturulamadı:', error);
      alert('Çalışma merkezi oluşturulurken bir hata oluştu.');
    }
  };

  const handleStatusChange = async (
    workCenterId: string,
    newStatus: WorkCenter['status']
  ) => {
    try {
      await updateWorkCenter(workCenterId, { status: newStatus });
      await loadWorkCenters();
      // seçili olan aynı work center ise local state’i de güncelle
      setSelectedWorkCenter((prev) => {
        if (!prev) return prev;
        if (String(prev.id) !== workCenterId) return prev;
        return { ...prev, status: newStatus };
      });
    } catch (error) {
      console.error('Durum güncellenemedi:', error);
      alert('Durum güncellenirken bir hata oluştu.');
    }
  };

  const getStatusColor = (status: WorkCenter['status']) => {
    const colors: Record<WorkCenter['status'], string> = {
      Available: 'bg-green-100 text-green-800',
      Busy: 'bg-yellow-100 text-yellow-800',
      'UnderMaintenance': 'bg-red-100 text-red-800',
    };
    return colors[status] ?? colors.Available;
  };

  const getStatusText = (status: WorkCenter['status']) => {
    const texts: Record<WorkCenter['status'], string> = {
      Available: 'Müsait',
      Busy: 'Meşgul',
      'UnderMaintenance': 'Bakımda',
    };
    return texts[status] ?? status;
  };

  const getOperationStatusColor = (status: OperationStatus) => {
    const colors: Record<OperationStatus, string> = {
      Waiting: 'bg-gray-100 text-gray-800',
      'InProgress': 'bg-yellow-100 text-yellow-800',
      Completed: 'bg-green-100 text-green-800',
      Paused: 'bg-orange-100 text-orange-800',
      Cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] ?? colors.Waiting;
  };

  const getOperationStatusText = (status: OperationStatus) => {
    const texts: Record<OperationStatus, string> = {
      Waiting: 'Bekliyor',
      'InProgress': 'Devam Ediyor',
      Completed: 'Tamamlandı',
      Paused: 'Duraklatıldı',
      Cancelled: 'İptal Edildi',
    };
    return texts[status] ?? status;
  };

  const activeOperations = operations.filter((op) => op.status !== 'Completed');
  const completedOperations = operations.filter((op) => op.status === 'Completed');

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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Çalışma Merkezleri</h1>
          <p className="text-gray-600 mt-1">
            Makineleri ve iş istasyonlarını yönetin
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Yeni Çalışma Merkezi
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Yeni Çalışma Merkezi
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ad *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="CNC Torna 1"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tip *
              </label>
              <input
                type="text"
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Tornalama"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Durum *
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as WorkCenter['status'],
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Available">Müsait</option>
                <option value="Busy">Meşgul</option>
                <option value="UnderMaintenance">Bakımda</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Konum
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kapasite (saat/adet)
              </label>
              <input
                type="number"
                value={formData.capacity_per_hour}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    capacity_per_hour: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hazırlık Süresi (dk)
              </label>
              <input
                type="number"
                value={formData.setup_time_minutes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    setup_time_minutes: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Oluştur
            </button>
          </div>
        </form>
      )}

      {workCenters.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Henüz çalışma merkezi yok
          </h3>
          <p className="text-gray-600">
            Yukarıdaki butonu kullanarak yeni çalışma merkezi ekleyin
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            {workCenters.map((wc) => (
              <div
                key={wc.id}
                onClick={() => setSelectedWorkCenter(wc)}
                className={`bg-white rounded-lg shadow-sm border-2 p-4 cursor-pointer transition-all ${
                  selectedWorkCenter?.id === wc.id
                    ? 'border-blue-500 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">{wc.name}</h3>
                    <p className="text-sm text-gray-600">{wc.type}</p>
                  </div>
                </div>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                    wc.status
                  )}`}
                >
                  {getStatusText(wc.status)}
                </span>
              </div>
            ))}
          </div>

          <div className="lg:col-span-2">
            {selectedWorkCenter ? (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        {selectedWorkCenter.name}
                      </h2>
                      <p className="text-gray-600 mt-1">
                        {selectedWorkCenter.type}
                      </p>
                    </div>
                    <span
                      className={`px-4 py-2 rounded-lg text-sm font-medium ${getStatusColor(
                        selectedWorkCenter.status
                      )}`}
                    >
                      {getStatusText(selectedWorkCenter.status)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {selectedWorkCenter.location && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Konum</p>
                        <p className="font-medium text-gray-900">
                          {selectedWorkCenter.location}
                        </p>
                      </div>
                    )}
                    {selectedWorkCenter.capacity_per_hour && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Kapasite</p>
                        <p className="font-medium text-gray-900">
                          {selectedWorkCenter.capacity_per_hour}/saat
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        handleStatusChange(
                          String(selectedWorkCenter.id),
                          'Available'
                        )
                      }
                      className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                        selectedWorkCenter.status === 'Available'
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Müsait
                    </button>
                    <button
                      onClick={() =>
                        handleStatusChange(String(selectedWorkCenter.id), 'Busy')
                      }
                      className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                        selectedWorkCenter.status === 'Busy'
                          ? 'bg-yellow-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Meşgul
                    </button>
                    <button
                      onClick={() =>
                        handleStatusChange(
                          String(selectedWorkCenter.id),
                          'UnderMaintenance'
                        )
                      }
                      className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                        selectedWorkCenter.status === 'UnderMaintenance'
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Bakımda
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      Operasyon Kuyruğu
                    </h3>
                  </div>

                  {activeOperations.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      Aktif operasyon yok
                    </p>
                  ) : (
                    <div className="space-y-3 mb-6">
                      {activeOperations.map((op) => (
                        <div
                          key={op.id}
                          className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">
                                {op.operation_name}
                              </h4>
                              <p className="text-sm text-gray-600">
                                İş Emri: {op.work_order?.order_number}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {op.work_order?.die_component?.component_type
                                  ?.name}{' '}
                                -{' '}
                                {
                                  op.work_order?.production_order?.die
                                    ?.die_number
                                }
                              </p>
                            </div>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${getOperationStatusColor(
                                op.status
                              )}`}
                            >
                              {getOperationStatusText(op.status)}
                            </span>
                          </div>
                          {op.operator_name && (
                            <p className="text-xs text-gray-500">
                              Operatör: {op.operator_name}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {completedOperations.length > 0 && (
                    <>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">
                        Tamamlanan Operasyonlar ({completedOperations.length})
                      </h4>
                      <div className="space-y-2">
                        {completedOperations.slice(0, 5).map((op) => (
                          <div
                            key={op.id}
                            className="border border-gray-100 rounded-lg p-3 bg-gray-50"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-700">
                                  {op.operation_name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {op.work_order?.order_number}
                                </p>
                              </div>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${getOperationStatusColor(
                                  op.status
                                )}`}
                              >
                                {getOperationStatusText(op.status)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <p className="text-gray-500">
                  Detayları görmek için bir çalışma merkezi seçin
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
