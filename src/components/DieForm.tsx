import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { ComponentType, SteelStockItem, DieType } from '../types/database';
import { getActiveDieTypes, getComponentTypesForDieType } from '../services/masterDataService';
import { getSteelStockItems } from '../services/stockService';
import { calculateTheoreticalConsumption } from '../lib/calculations';

interface SelectedComponent {
  componentTypeId: string;
  stockItemId: string;
  packageLengthMm: number;
  diameterMm: number;
  theoreticalConsumptionKg: number;
}

interface DieFormProps {
  onSubmit: (data: {
    dieNumber: string;
    dieDiameterMm: number;
    totalPackageLengthMm: number;
    dieTypeId: string;
    designFileUrl?: string;
    components: SelectedComponent[];
  }) => void;
  onCancel: () => void;
}

export function DieForm({ onSubmit, onCancel }: DieFormProps) {
  const [dieNumber, setDieNumber] = useState('');
  const [dieDiameterMm, setDieDiameterMm] = useState('');
  const [totalPackageLengthMm, setTotalPackageLengthMm] = useState('');
  const [dieTypeId, setDieTypeId] = useState('');
  const [designFileUrl, setDesignFileUrl] = useState('');

  const [dieTypes, setDieTypes] = useState<DieType[]>([]);
  const [availableComponents, setAvailableComponents] = useState<ComponentType[]>([]);
  const [steelItems, setSteelItems] = useState<SteelStockItem[]>([]);
  const [selectedComponents, setSelectedComponents] = useState<SelectedComponent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (dieTypeId) {
      loadComponentTypes();
    }
  }, [dieTypeId]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [dieTypesData, steel] = await Promise.all([
        getActiveDieTypes(),
        getSteelStockItems(),
      ]);
      setDieTypes(dieTypesData);
      setSteelItems(steel);
      if (dieTypesData.length > 0) {
        setDieTypeId(dieTypesData[0].id);
      }
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadComponentTypes = async () => {
    if (!dieTypeId) return;

    try {
      const components = await getComponentTypesForDieType(dieTypeId);
      setAvailableComponents(components);
      setSelectedComponents([]);
    } catch (error) {
      console.error('Bileşen tipleri yükleme hatası:', error);
    }
  };

  const addComponent = () => {
    setSelectedComponents([
      ...selectedComponents,
      {
        componentTypeId: '',
        stockItemId: '',
        packageLengthMm: 0,
        diameterMm: 0,
        theoreticalConsumptionKg: 0,
      },
    ]);
  };

  const removeComponent = (index: number) => {
    setSelectedComponents(selectedComponents.filter((_, i) => i !== index));
  };

  const updateComponent = (index: number, field: keyof SelectedComponent, value: any) => {
    const updated = [...selectedComponents];
    updated[index] = { ...updated[index], [field]: value };

    if (field === 'stockItemId') {
      const stockItem = steelItems.find(s => s.id === value);
      if (stockItem) {
        updated[index].diameterMm = stockItem.diameter_mm;
        if (updated[index].packageLengthMm > 0) {
          updated[index].theoreticalConsumptionKg = calculateTheoreticalConsumption(
            updated[index].packageLengthMm,
            stockItem.diameter_mm
          );
        }
      }
    }

    if (field === 'packageLengthMm' && updated[index].diameterMm > 0) {
      updated[index].theoreticalConsumptionKg = calculateTheoreticalConsumption(
        Number(value),
        updated[index].diameterMm
      );
    }

    setSelectedComponents(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      dieNumber,
      dieDiameterMm: Number(dieDiameterMm),
      totalPackageLengthMm: Number(totalPackageLengthMm),
      dieTypeId,
      designFileUrl: designFileUrl || undefined,
      components: selectedComponents,
    });
  };

  const isValid = dieNumber && dieDiameterMm && totalPackageLengthMm && dieTypeId && selectedComponents.length > 0 &&
    selectedComponents.every(c => c.componentTypeId && c.stockItemId && c.packageLengthMm > 0);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="text-gray-600 mt-4">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Kalıp Bilgileri</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kalıp Numarası *
            </label>
            <input
              type="text"
              value={dieNumber}
              onChange={(e) => setDieNumber(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kalıp Tipi *
            </label>
            <select
              value={dieTypeId}
              onChange={(e) => setDieTypeId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              {dieTypes.map((dt) => (
                <option key={dt.id} value={dt.id}>
                  {dt.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kalıp Çapı (mm) *
            </label>
            <input
              type="number"
              value={dieDiameterMm}
              onChange={(e) => setDieDiameterMm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Toplam Paket Uzunluğu (mm) *
            </label>
            <input
              type="number"
              value={totalPackageLengthMm}
              onChange={(e) => setTotalPackageLengthMm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              min="0"
              step="0.01"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tasarım Dosyası URL
            </label>
            <input
              type="text"
              value={designFileUrl}
              onChange={(e) => setDesignFileUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://..."
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Bileşenler</h3>
          <button
            type="button"
            onClick={addComponent}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            disabled={availableComponents.length === 0}
          >
            <Plus className="w-4 h-4" />
            Bileşen Ekle
          </button>
        </div>

        {availableComponents.length === 0 ? (
          <div className="text-center py-8 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800">Bu kalıp tipi için tanımlanmış bileşen yok.</p>
            <p className="text-sm text-yellow-600 mt-1">Lütfen önce Kalıp Tipi - Bileşen Eşlemesi sayfasından bileşen atayın.</p>
          </div>
        ) : selectedComponents.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Henüz bileşen eklenmedi. Yukarıdaki butonu kullanarak bileşen ekleyin.
          </p>
        ) : (
          <div className="space-y-4">
            {selectedComponents.map((component, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bileşen Tipi *
                      </label>
                      <select
                        value={component.componentTypeId}
                        onChange={(e) => updateComponent(index, 'componentTypeId', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="">Seçiniz</option>
                        {availableComponents.map((ct) => (
                          <option key={ct.id} value={ct.id}>
                            {ct.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Çelik Ürün *
                      </label>
                      <select
                        value={component.stockItemId}
                        onChange={(e) => updateComponent(index, 'stockItemId', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="">Seçiniz</option>
                        {steelItems.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.alloy} - Ø{item.diameter_mm}mm
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Paket Uzunluğu (mm) *
                      </label>
                      <input
                        type="number"
                        value={component.packageLengthMm || ''}
                        onChange={(e) => updateComponent(index, 'packageLengthMm', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Teorik Tüketim (kg)
                      </label>
                      <input
                        type="text"
                        value={component.theoreticalConsumptionKg.toFixed(2)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                        readOnly
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeComponent(index)}
                    className="mt-6 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          İptal
        </button>
        <button
          type="submit"
          disabled={!isValid}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Kalıp Oluştur
        </button>
      </div>
    </form>
  );
}
