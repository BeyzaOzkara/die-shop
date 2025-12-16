import { useState, useEffect } from 'react';
import { Link2, Plus, Trash2 } from 'lucide-react';
import {
  getActiveDieTypes,
  getActiveComponentTypes,
  getComponentTypesForDieType,
  addDieTypeComponent,
  removeDieTypeComponent,
} from '../services/masterDataService';
import type { DieType, ComponentType } from '../types/database';

export function DieTypeComponentsPage() {
  const [dieTypes, setDieTypes] = useState<DieType[]>([]);
  const [componentTypes, setComponentTypes] = useState<ComponentType[]>([]);
  const [selectedDieType, setSelectedDieType] = useState<DieType | null>(null);
  const [assignedComponents, setAssignedComponents] = useState<ComponentType[]>([]);
  const [availableComponents, setAvailableComponents] = useState<ComponentType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedDieType) {
      loadAssignedComponents();
    }
  }, [selectedDieType, componentTypes]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dieTypesData, componentTypesData] = await Promise.all([
        getActiveDieTypes(),
        getActiveComponentTypes(),
      ]);
      setDieTypes(dieTypesData);
      setComponentTypes(componentTypesData);
      if (dieTypesData.length > 0) {
        setSelectedDieType(dieTypesData[0]);
      }
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAssignedComponents = async () => {
    if (!selectedDieType) return;

    try {
      const assigned = await getComponentTypesForDieType(String(selectedDieType.id));
      setAssignedComponents(assigned);

      const assignedIds = new Set(assigned.map((c) => c.id));
      const available = componentTypes.filter((c) => !assignedIds.has(c.id));
      setAvailableComponents(available);
    } catch (error) {
      console.error('Atanmış bileşenler yüklenemedi:', error);
    }
  };

  const handleAddComponent = async (componentId: number) => {
    if (!selectedDieType) return;

    try {
      await addDieTypeComponent(String(selectedDieType.id), String(componentId));
      await loadAssignedComponents();
    } catch (error: any) {
      console.error('Ekleme başarısız:', error);
      alert(error.message || 'Bileşen eklenemedi');
    }
  };

  const handleRemoveComponent = async (componentId: number) => {
    if (!selectedDieType) return;
    if (!confirm('Bu bileşeni kaldırmak istediğinizden emin misiniz?')) return;

    try {
      await removeDieTypeComponent(String(selectedDieType.id), String(componentId));
      await loadAssignedComponents();
    } catch (error: any) {
      console.error('Kaldırma başarısız:', error);
      alert(error.message || 'Bileşen kaldırılamadı');
    }
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
        <h1 className="text-3xl font-bold text-gray-900">
          Kalıp Tipi – Bileşen Eşlemesi
        </h1>
        <p className="text-gray-600 mt-1">
          Her kalıp tipi için kullanılabilir bileşenleri tanımlayın
        </p>
      </div>

      {dieTypes.length === 0 || componentTypes.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Link2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Eşleme için veri eksik
          </h3>
          <p className="text-gray-600 mb-4">
            {dieTypes.length === 0 && 'Önce kalıp tipi tanımlayın. '}
            {componentTypes.length === 0 && 'Önce bileşen tipi tanımlayın.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Kalıp Tipleri</h3>
              <div className="space-y-2">
                {dieTypes.map((dt) => (
                  <button
                    key={dt.id}
                    onClick={() => setSelectedDieType(dt)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                      selectedDieType?.id === dt.id
                        ? 'bg-blue-50 text-blue-700 font-medium border-2 border-blue-500'
                        : 'bg-gray-50 text-gray-900 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                  >
                    <div className="font-medium">{dt.name}</div>
                    <div className="text-xs text-gray-500">{dt.code}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedDieType ? (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {selectedDieType.name} - Atanmış Bileşenler
                  </h3>
                  {assignedComponents.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      Bu kalıp tipine henüz bileşen atanmamış
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {assignedComponents.map((comp) => (
                        <div
                          key={comp.id}
                          className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                        >
                          <div>
                            <div className="font-medium text-gray-900">
                              {comp.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {comp.code}
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveComponent(comp.id)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Kullanılabilir Bileşenler
                  </h3>
                  {availableComponents.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      Tüm bileşenler atanmış
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {availableComponents.map((comp) => (
                        <div
                          key={comp.id}
                          className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div>
                            <div className="font-medium text-gray-900">
                              {comp.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {comp.code}
                            </div>
                          </div>
                          <button
                            onClick={() => handleAddComponent(comp.id)}
                            className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                            Ekle
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <p className="text-gray-500">Bir kalıp tipi seçin</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
