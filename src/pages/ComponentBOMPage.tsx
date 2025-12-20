import { useState, useEffect } from 'react';
import { List, Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { getActiveComponentTypes } from '../services/masterDataService';
import {
  getComponentBOM,
  createBOMOperation,
  updateBOMOperation,
  deleteBOMOperation,
} from '../services/componentService'; // 🔹 componentService -> componentServices
import { getWorkCenters } from '../services/workCenterService';
import { getOperationTypes } from '../services/operationTypeService';
import type { ComponentType, ComponentBOM, WorkCenter, OperationType } from '../types/database';

export function ComponentBOMPage() {
  const [componentTypes, setComponentTypes] = useState<ComponentType[]>([]);
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([]);
  const [operationTypes, setOperationTypes] = useState<OperationType[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<ComponentType | null>(null);

  const [operations, setOperations] = useState<ComponentBOM[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    sequence_number: '',
    operation_type_id: '',
    operation_name: '',  
    preferred_work_center_id: '', // optional
    estimated_duration_minutes: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedComponent) {
      loadOperations();
    }
    // selectedComponent değiştiğinde operasyonları yeniden çekiyoruz
  }, [selectedComponent]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [componentsData, centersData, opTypesData] = await Promise.all([
        getActiveComponentTypes(),
        getWorkCenters(),
        getOperationTypes(),
      ]);
      setComponentTypes(componentsData);
      setWorkCenters(centersData);
      setOperationTypes(opTypesData);
      if (componentsData.length > 0) {
        setSelectedComponent(componentsData[0]);
      }
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOperations = async () => {
    if (!selectedComponent) return;

    try {
      // selectedComponent.id: number, service de number bekliyor
      const data = await getComponentBOM(selectedComponent.id);
      // İstersen burada sıralama da yapabilirsin
      data.sort((a, b) => a.sequence_number - b.sequence_number);
      setOperations(data);
    } catch (error) {
      console.error('Operasyonlar yüklenemedi:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComponent) return;

    try {
      const payload = {
        component_type_id: selectedComponent.id, // number
        sequence_number: Number(formData.sequence_number),

        operation_type_id: Number(formData.operation_type_id),
        operation_name: formData.operation_name.trim(),   
        preferred_work_center_id: formData.preferred_work_center_id
          ? Number(formData.preferred_work_center_id)
          : null,

        estimated_duration_minutes: formData.estimated_duration_minutes
          ? Number(formData.estimated_duration_minutes)
          : undefined,
        notes: formData.notes || undefined,
      };

      if (editingId !== null) {
        await updateBOMOperation(editingId, payload);
      } else {
        await createBOMOperation(payload);
      }
      resetForm();
      loadOperations();
    } catch (error: any) {
      console.error('İşlem başarısız:', error);
      alert(error.message || 'Bir hata oluştu');
    }
  };

  const handleEdit = (operation: ComponentBOM) => {
    setEditingId(operation.id); // id number
    setFormData({
      sequence_number: operation.sequence_number.toString(),
      operation_name: operation.operation_name.trim(),   
      operation_type_id: String(operation.operation_type_id),
      preferred_work_center_id: operation.preferred_work_center_id
        ? String(operation.preferred_work_center_id)
        : '',

      estimated_duration_minutes:
        operation.estimated_duration_minutes?.toString() || '',
      notes: operation.notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bu operasyonu silmek istediğinizden emin misiniz?')) return;

    try {
      await deleteBOMOperation(id);
      loadOperations();
    } catch (error: any) {
      console.error('Silme başarısız:', error);
      alert(error.message || 'Silme işlemi başarısız oldu');
    }
  };

  const resetForm = () => {
    setFormData({
      sequence_number: '',
      operation_type_id: '',
      operation_name: '',
      preferred_work_center_id: '',
      estimated_duration_minutes: '',
      notes: '',
    });
    setEditingId(null);
    setShowForm(false);
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
        <h1 className="text-3xl font-bold text-gray-900">Bileşen BOM Yönetimi</h1>
        <p className="text-gray-600 mt-1">
          Bileşen tiplerinin operasyon rotalarını tanımlayın
        </p>
      </div>

      {componentTypes.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <List className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Henüz bileşen tipi yok
          </h3>
          <p className="text-gray-600">Önce bileşen tipleri tanımlayın</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Bileşen Tipleri</h3>
              <div className="space-y-2">
                {componentTypes.map((ct) => (
                  <button
                    key={ct.id}
                    onClick={() => {
                      setSelectedComponent(ct);
                      resetForm(); // sadece formu temizle, seçimi bozma
                    }}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                      selectedComponent?.id === ct.id
                        ? 'bg-blue-50 text-blue-700 font-medium border-2 border-blue-500'
                        : 'bg-gray-50 text-gray-900 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                  >
                    <div className="font-medium">{ct.name}</div>
                    <div className="text-xs text-gray-500">{ct.code}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedComponent ? (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {selectedComponent.name} - Operasyon Rotası
                    </h3>
                    <button
                      onClick={() => setShowForm(!showForm)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Operasyon Ekle
                    </button>
                  </div>

                  {showForm && (
                    <form
                      onSubmit={handleSubmit}
                      className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">
                          {editingId ? "Operasyon Düzenle" : "Yeni Operasyon"}
                        </h4>

                        {/* küçük ipucu (isteğe bağlı) */}
                        <span className="text-xs text-gray-500">
                          * zorunlu alanlar
                        </span>
                      </div>

                      {/* ====== FORM GRID ====== */}
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-4">
                        {/* 1) Operasyon Sırası (kısa) */}
                        <div className="md:col-span-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Sıra *
                          </label>
                          <input
                            type="number"
                            value={formData.sequence_number}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                sequence_number: e.target.value,
                              })
                            }
                            className="w-full max-w-[120px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                            min="1"
                            inputMode="numeric"
                          />
                        </div>

                        {/* 2) Operasyon Adı (geniş) */}
                        <div className="md:col-span-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Operasyon Adı *
                          </label>
                          <input
                            value={formData.operation_name}
                            onChange={(e) =>
                              setFormData({ ...formData, operation_name: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Örn: Bakır Markalama"
                            required
                          />
                        </div>

                        {/* 3) Operasyon Tipi (aynı satır) */}
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Operasyon Tipi *
                          </label>
                          <select
                            value={formData.operation_type_id}
                            onChange={(e) =>
                              setFormData({ ...formData, operation_type_id: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          >
                            <option value="">Seçiniz</option>
                            {operationTypes.map((ot) => (
                              <option key={ot.id} value={String(ot.id)}>
                                {ot.name} ({ot.code})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* 4) Çalışma Merkezi */}
                        <div className="md:col-span-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Önerilen Çalışma Merkezi <span className="text-gray-400">(Opsiyonel)</span>
                          </label>
                          <select
                            value={formData.preferred_work_center_id}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                preferred_work_center_id: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">(Boş bırakılabilir)</option>
                            {workCenters.map((wc) => (
                              <option key={wc.id} value={String(wc.id)}>
                                {wc.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* 5) Süre */}
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tahmini Süre <span className="text-gray-400">(dk)</span>
                          </label>
                          <input
                            type="number"
                            value={formData.estimated_duration_minutes}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                estimated_duration_minutes: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            min="0"
                            inputMode="numeric"
                            placeholder="Örn: 25"
                          />
                        </div>

                        {/* 6) Notlar */}
                        <div className="md:col-span-6">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notlar <span className="text-gray-400">(Opsiyonel)</span>
                          </label>
                          <textarea
                            value={formData.notes}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                notes: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            rows={2}
                            placeholder="Kısa not..."
                          />
                        </div>
                      </div>

                      {/* ====== ACTIONS ====== */}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={resetForm}
                          className="flex items-center gap-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <X className="w-4 h-4" />
                          İptal
                        </button>

                        <button
                          type="submit"
                          className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Save className="w-4 h-4" />
                          {editingId ? "Güncelle" : "Ekle"}
                        </button>
                      </div>
                    </form>
                  )}

                  {operations.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      Henüz operasyon tanımlanmamış
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {operations.map((op) => (
                        <div
                          key={op.id}
                          className="flex items-start justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm">
                                {op.sequence_number}
                              </span>
                              <div>
                                <div className="font-medium text-gray-900">
                                  {op.operation_name}
                                </div>
                                <div className="font-medium text-gray-900">
                                  Tip: {op.operation_type?.name ?? `OperationType#${op.operation_type_id}`}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {op.preferred_work_center?.name
                                    ? `Önerilen: ${op.preferred_work_center.name}`
                                    : 'Önerilen çalışma merkezi yok'}
                                </div>
                              </div>
                            </div>

                            {op.estimated_duration_minutes !== null && op.estimated_duration_minutes !== undefined && (
                              <div className="text-sm text-gray-500 ml-11">
                                Tahmini Süre: {op.estimated_duration_minutes} dakika
                              </div>
                            )}
                            {op.notes && (
                              <div className="text-sm text-gray-500 ml-11 mt-1">
                                {op.notes}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => handleEdit(op)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(op.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <p className="text-gray-500">Bir bileşen tipi seçin</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
