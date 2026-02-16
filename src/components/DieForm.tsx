import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { ComponentType, SteelStockItem, DieType, Die, FileItem } from '../types/database';
import { getActiveDieTypes, getComponentTypesForDieType } from '../services/masterDataService';
import { getSteelStockItems } from '../services/stockService';
import { calculateTheoreticalConsumption } from '../lib/calculations';
import { deleteDieFile, uploadDieFiles } from '../services/dieService';

interface SelectedComponent {
  id?: number; // sadece edit modunda var, yeni eklenenlerde yok
  componentTypeId: string;
  stockItemId: string;
  packageLengthMm: number;
  diameterMm: number;
  theoreticalConsumptionKg: number;
}

interface DieFormProps {
  mode: 'create' | 'edit';
  initialData?: Die; // required when mode='edit'
  onSubmit: (data: {
    dieNumber: string;
    dieDiameterMm: number;
    totalPackageLengthMm: number;
    dieTypeId: string;
    designFiles: File[];              // ✅ çoklu + opsiyonel (boş array olabilir)
    components: SelectedComponent[];

    profileNo?: string;
    figureCount?: number | null;
    customerName?: string;
    pressCode?: string;

    isRevisioned: boolean;
  }) => void | Promise<void>;
  onCancel: () => void;
}

export function DieForm({ mode, initialData, onSubmit, onCancel }: DieFormProps) {
  const [dieNumber, setDieNumber] = useState(initialData?.die_number || '');
  const [dieDiameterMm, setDieDiameterMm] = useState(initialData?.die_diameter_mm?.toString() || '');
  const [totalPackageLengthMm, setTotalPackageLengthMm] = useState(initialData?.total_package_length_mm?.toString() || '');
  const [dieTypeId, setDieTypeId] = useState(initialData?.die_type_id?.toString() || '');

  const [profileNo, setProfileNo] = useState(initialData?.profile_no || '');
  const [figureCount, setFigureCount] = useState(initialData?.figure_count?.toString() || '');
  const [customerName, setCustomerName] = useState(initialData?.customer_name || '');
  const [pressCode, setPressCode] = useState(initialData?.press_code || '');

  const [isRevisioned, setIsRevisioned] = useState(initialData?.is_revisioned || false);
  const [designFiles, setDesignFiles] = useState<File[]>([]);

  // Existing files for edit mode
  const [existingFiles, setExistingFiles] = useState<FileItem[]>(initialData?.files || []);
  const [deletingFileId, setDeletingFileId] = useState<number | null>(null);

  const [dieTypes, setDieTypes] = useState<DieType[]>([]);
  const [availableComponents, setAvailableComponents] = useState<ComponentType[]>([]);
  const [steelItems, setSteelItems] = useState<SteelStockItem[]>([]);
  const [selectedComponents, setSelectedComponents] = useState<SelectedComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
      // Initialize components from initialData if in edit mode
      if (mode === 'edit' && initialData?.components) {
        const mappedComponents: SelectedComponent[] = initialData.components.map(c => ({
          id: c.id,
          componentTypeId: String(c.component_type_id),
          stockItemId: String(c.stock_item_id),
          packageLengthMm: c.package_length_mm,
          diameterMm: c.stock_item?.diameter_mm || 0,
          theoreticalConsumptionKg: c.theoretical_consumption_kg,
        }));
        setSelectedComponents(mappedComponents);
      }

      if (!initialData && dieTypesData.length > 0) {
        setDieTypeId(String(dieTypesData[0].id));
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
      // Only clear components in create mode
      if (mode === 'create') {
        setSelectedComponents([]);
      }
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

    const handleDeleteFile = async (fileId: number) => {
    if (!confirm('Bu dosyayı silmek istediğinizden emin misiniz?')) return;
    if (!initialData) return;

    try {
      setDeletingFileId(fileId);
      await deleteDieFile(initialData.id, fileId);
      setExistingFiles(existingFiles.filter(f => f.id !== fileId));
    } catch (error) {
      console.error('Dosya silme hatası:', error);
      alert('Dosya silinemedi.');
    } finally {
      setDeletingFileId(null);
    }
  };

  const handleFileUpload = async (files: File[]) => {
    if (!initialData || files.length === 0) {
      setDesignFiles(files);
      return;
    }

    // In edit mode, upload files immediately
    try {
      await uploadDieFiles(initialData.id, files);
      // Reload die to get updated file list
      const updatedDie = await import('../services/dieService').then(m => m.getDieById(initialData.id));
      if (updatedDie) {
        setExistingFiles(updatedDie.files || []);
      }
      alert('Dosyalar başarıyla yüklendi.');
    } catch (error) {
      console.error('Dosya yükleme hatası:', error);
      alert('Dosya yüklenemedi.');
    }
  };

  const removeComponent = (index: number) => {
    setSelectedComponents(selectedComponents.filter((_, i) => i !== index));
  };

  const updateComponent = (
    index: number,
    field: keyof SelectedComponent,
    value: any
  ) => {
    const updated = [...selectedComponents];
    updated[index] = { ...updated[index], [field]: value };

    if (field === 'stockItemId') {
      const stockItem = steelItems.find((s) => s.id === Number(value));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (mode === 'create') {
        // Create mode: call onSubmit with all data
        await onSubmit({
          dieNumber,
          dieDiameterMm: Number(dieDiameterMm),
          totalPackageLengthMm: Number(totalPackageLengthMm),
          dieTypeId,
          designFiles,
          components: selectedComponents,
          profileNo,
          figureCount: figureCount ? Number(figureCount) : null,
          customerName,
          pressCode,
          isRevisioned,
        });
      } else {
        // Edit mode: update die and components via API
        if (!initialData) throw new Error('No initial data for edit mode');

        const { updateDie, replaceDieComponents } = await import('../services/dieService');

        // Update die fields
        await updateDie(initialData.id, {
          dieDiameterMm: Number(dieDiameterMm),
          totalPackageLengthMm: Number(totalPackageLengthMm),
          dieTypeId: Number(dieTypeId),
          profileNo,
          figureCount: figureCount ? Number(figureCount) : null,
          customerName,
          pressCode,
          isRevisioned,
        });

        // Update components
        await replaceDieComponents(
          initialData.id,
          selectedComponents.map(c => ({
            id: c.id,
            componentTypeId: Number(c.componentTypeId),
            stockItemId: Number(c.stockItemId),
            packageLengthMm: c.packageLengthMm,
            theoreticalConsumptionKg: c.theoreticalConsumptionKg,
          }))
        );

        // Call onSubmit to signal success (parent can handle refresh)
        await onSubmit({
          dieNumber,
          dieDiameterMm: Number(dieDiameterMm),
          totalPackageLengthMm: Number(totalPackageLengthMm),
          dieTypeId,
          designFiles,
          components: selectedComponents,
          profileNo,
          figureCount: figureCount ? Number(figureCount) : null,
          customerName,
          pressCode,
          isRevisioned,
        });
      }
    } catch (error) {
      console.error('Form submission error:', error);
      alert(mode === 'create' ? 'Kalıp oluşturulamadı.' : 'Kalıp güncellenemedi.');
    } finally {
      setSaving(false);
    }
  };

  const isValid =
    dieNumber &&
    dieDiameterMm &&
    totalPackageLengthMm &&
    dieTypeId &&
    profileNo &&
    figureCount &&
    customerName &&
    pressCode &&
    selectedComponents.length > 0 &&
    selectedComponents.every(
      (c) => c.componentTypeId && c.stockItemId && c.packageLengthMm > 0
    );

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
      {/* ===================== */}
      {/* Kalıp Bilgileri */}
      {/* ===================== */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Kalıp Bilgileri</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Kalıp Numarası */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kalıp Numarası *
            </label>
            <input
              type="text"
              value={dieNumber}
              onChange={(e) => setDieNumber(e.target.value)}
              readOnly={mode === 'edit'}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${mode === 'edit' ? 'bg-gray-50 cursor-not-allowed' : ''}`}
              required
            />
          </div>

          {/* Profil No + Revizyonlu */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Profil No *
            </label>

            <div className="flex items-center gap-3">
              <input
                type="text"
                value={profileNo}
                onChange={(e) => setProfileNo(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />

              {/* Revizyonlu */}
              <label className="flex items-center gap-2 text-sm text-gray-700 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={isRevisioned}
                  onChange={(e) => setIsRevisioned(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Revizyonlu
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pres Kodu *</label>
            <input
              type="text"
              value={pressCode}
              onChange={(e) => setPressCode(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Müşteri Adı *</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
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
                <option key={dt.id} value={String(dt.id)}>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Figür Sayısı *</label>
            <input
              type="number"
              value={figureCount}
              onChange={(e) => setFigureCount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              min="0"
              step="1"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tasarım Dosyaları (opsiyonel)
            </label>
            {/* Existing files in edit mode */}
            {mode === 'edit' && existingFiles.length > 0 && (
              <div className="mb-3 space-y-2">
                <p className="text-xs font-medium text-gray-600">Mevcut Dosyalar:</p>
                {existingFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
                    <span className="text-sm text-gray-700">{file.original_name}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteFile(file.id)}
                      disabled={deletingFileId === file.id}
                      className="text-red-600 hover:text-red-800 disabled:opacity-50"
                      title="Dosyayı sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              type="file"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (mode === 'edit') {
                  handleFileUpload(files);
                  e.target.value = ''; // Clear input after upload
                } else {
                  setDesignFiles(files);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {mode === 'create' && designFiles.length > 0 && (
              <div className="mt-2 text-xs text-gray-600 space-y-1">
                {designFiles.map((f) => (
                  <div key={f.name}>{f.name}</div>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {mode === 'edit'
                ? 'Yeni dosya seçtiğinizde hemen yüklenecektir.'
                : 'Dosya eklemek zorunlu değil. Birden fazla dosya seçebilirsiniz.'
              }
            </p>
          </div>
        </div>
      </div>

      {/* ===================== */}
      {/* Bileşenler (FULL) */}
      {/* ===================== */}
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
            <p className="text-sm text-yellow-600 mt-1">
              Lütfen önce Kalıp Tipi - Bileşen Eşlemesi sayfasından bileşen atayın.
            </p>
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
                        onChange={(e) =>
                          updateComponent(index, 'componentTypeId', e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="">Seçiniz</option>
                        {availableComponents.map((ct) => (
                          <option key={ct.id} value={String(ct.id)}>
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
                        onChange={(e) =>
                          updateComponent(index, 'stockItemId', e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="">Seçiniz</option>
                        {steelItems.map((item) => (
                          <option key={item.id} value={String(item.id)}>
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
                        // onChange={(e) =>
                        //   updateComponent(index, 'packageLengthMm', e.target.value)
                        // }
                        onChange={(e) => {
                          const v = e.target.value;
                          // input type=number bazı klavyelerde "12,5" getirebiliyor → normalize
                          const normalized = v.replace(",", ".");
                          const num = normalized === "" ? 0 : Number(normalized);
                          updateComponent(index, "packageLengthMm", Number.isFinite(num) ? num : 0);
                        }}
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
                    title="Bileşeni kaldır"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===================== */}
      {/* Actions */}
      {/* ===================== */}
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          İptal
        </button>
        <button
          type="submit"
          disabled={!isValid || saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {saving && <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
          {mode === 'edit' ? 'Değişiklikleri Kaydet' : 'Kalıp Oluştur'}
        </button>
      </div>
    </form>
  );
}
