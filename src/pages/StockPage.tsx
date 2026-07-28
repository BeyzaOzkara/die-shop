import { useState, useEffect, useCallback } from 'react';
import { Package, Plus, Trash2, Scissors, Database, ArrowRightLeft, Settings, Pencil, Box, MapPin, Beaker, Lock } from 'lucide-react';
import {
  getStockItems,
  createStockItem,
  getLots,
  createLot,
  getStockTransactions,
  cutSteel,
  getLocations,
  createLocation,
  updateLocation,
  deleteLocation,
  getItemCategories,
  createItemCategory,
  updateItemCategory,
  deleteItemCategory,
  getMaterialGrades,
  createMaterialGrade,
  updateMaterialGrade,
  deleteMaterialGrade
} from '../services/stockService';
import {
  getSuppliers,
  createSupplier,
  type SupplierCreatePayload,
} from '../services/supplierService';
import type {
  StockItem,
  Lot,
  StockTransaction,
  Supplier,
  Location,
  ItemCategory,
  MaterialGrade
} from '../types/database';

const EMPTY_SUPPLIER_FORM: SupplierCreatePayload = {
  name: '',
  tax_no: '',
  contact_name: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
};

type Tab = 'items' | 'lots' | 'transactions' | 'categories' | 'locations' | 'material_grades';

export function StockPage() {
  const [activeTab, setActiveTab] = useState<Tab>('items');
  const [loading, setLoading] = useState(true);

  // --- Data States ---
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [materialGrades, setMaterialGrades] = useState<MaterialGrade[]>([]);

  // --- UI States (Operations) ---
  const [showItemForm, setShowItemForm] = useState(false);
  const [showLotForm, setShowLotForm] = useState(false);
  const [showCutModal, setShowCutModal] = useState(false);
  const [showQuickSupplier, setShowQuickSupplier] = useState(false);

  // --- UI States (Master Data) ---
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showMaterialGradeModal, setShowMaterialGradeModal] = useState(false);

  // --- Edit states (Master Data) ---
  const [editingCategory, setEditingCategory] = useState<ItemCategory | null>(null);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [editingMaterialGrade, setEditingMaterialGrade] = useState<MaterialGrade | null>(null);

  // --- Form States (Operations) ---
  const [newItem, setNewItem] = useState({
    category_id: '',
    location_id: '',
    lot_id: '',
    quantity: '',
    attrDiameter: '',
    attrLength: ''
  });

  const [newLot, setNewLot] = useState({
    lot_number: '',
    certificate_number: '',
    supplier_id: '',
    material_grade_id: '',
    receive_date: new Date().toISOString().split('T')[0],
  });
  const [lotCertificateFiles, setLotCertificateFiles] = useState<File[]>([]);

  const [cutData, setCutData] = useState({
    parent_id: 0,
    cut_quantity: '',
    cut_length: '',
    notes: ''
  });

  const [quickForm, setQuickForm] = useState<SupplierCreatePayload>(EMPTY_SUPPLIER_FORM);
  const [quickSubmitting, setQuickSubmitting] = useState(false);
  const [quickError, setQuickError] = useState('');

  // --- Form States (Master Data) ---
  const [categoryForm, setCategoryForm] = useState({ name: '', base_uom: 'Adet', is_cuttable: false });
  const [locationForm, setLocationForm] = useState({ name: '', location_type: 'WAREHOUSE', description: '' });
  const [materialGradeForm, setMaterialGradeForm] = useState({ name: '' });
  const [compositionList, setCompositionList] = useState<{ element: string; percentage: number | '' }[]>([
    { element: '', percentage: '' },
  ]);

  // --- Data Loading ---
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [
        itemsData, lotsData, transData, suppData, locData, catData, gradeData
      ] = await Promise.all([
        getStockItems(),
        getLots(),
        getStockTransactions(),
        getSuppliers({ active: true }),
        getLocations(),
        getItemCategories(),
        getMaterialGrades()
      ]);
      setStockItems(itemsData);
      setLots(lotsData);
      setTransactions(transData);
      setSuppliers(suppData);
      setLocations(locData);
      setCategories(catData);
      setMaterialGrades(gradeData);
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- Operations Handlers ---
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const attributes: Record<string, any> = {};
      if (newItem.attrDiameter) attributes.diameter_mm = Number(newItem.attrDiameter);
      if (newItem.attrLength) attributes.length_mm = Number(newItem.attrLength);

      await createStockItem({
        item_type: 'RAW_MATERIAL',
        category_id: Number(newItem.category_id),
        location_id: newItem.location_id ? Number(newItem.location_id) : null,
        lot_id: newItem.lot_id ? Number(newItem.lot_id) : null,
        quantity: Number(newItem.quantity),
        attributes: Object.keys(attributes).length > 0 ? attributes : undefined
      });

      setNewItem({
        category_id: '', location_id: '', lot_id: '', quantity: '',
        attrDiameter: '', attrLength: ''
      });
      setShowItemForm(false);
      loadData();
    } catch (error) {
      console.error('Stok kalemi oluşturulamadı:', error);
      alert('Stok kalemi oluşturulurken bir hata oluştu.');
    }
  };

  const handleCreateLot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createLot({
        lot_number: newLot.lot_number,
        certificate_number: newLot.certificate_number || undefined,
        supplier_id: newLot.supplier_id ? Number(newLot.supplier_id) : null,
        material_grade_id: newLot.material_grade_id ? Number(newLot.material_grade_id) : null,
        receive_date: newLot.receive_date
      }, lotCertificateFiles);

      setNewLot({
        lot_number: '', certificate_number: '', supplier_id: '',
        material_grade_id: '', receive_date: new Date().toISOString().split('T')[0]
      });
      setLotCertificateFiles([]);
      setShowLotForm(false);
      loadData();
    } catch (error) {
      console.error('Lot oluşturulamadı:', error);
      alert('Lot oluşturulurken bir hata oluştu.');
    }
  };

  const handleCutSteel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await cutSteel({
        parent_stock_item_id: cutData.parent_id,
        cut_quantity: Number(cutData.cut_quantity),
        child_attributes: { length_mm: Number(cutData.cut_length), piece_type: 'cut_piece' },
        notes: cutData.notes || undefined
      });
      setCutData({ parent_id: 0, cut_quantity: '', cut_length: '', notes: '' });
      setShowCutModal(false);
      loadData();
    } catch (error: any) {
      console.error('Kesim hatası:', error);
      alert(error?.response?.data?.detail || 'Kesim işlemi sırasında hata oluştu.');
    }
  };

  const handleQuickSupplierCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickForm.name?.trim()) {
      setQuickError('Tedarikçi adı zorunludur.');
      return;
    }
    setQuickSubmitting(true);
    setQuickError('');
    try {
      const created = await createSupplier({
        ...quickForm,
        name: quickForm.name!.trim(),
        tax_no: quickForm.tax_no?.trim() || undefined,
      });
      const updated = await getSuppliers({ active: true });
      setSuppliers(updated);
      setNewLot((prev) => ({ ...prev, supplier_id: String(created.id) }));
      setShowQuickSupplier(false);
      setQuickForm(EMPTY_SUPPLIER_FORM);
    } catch (err: any) {
      setQuickError(err?.response?.data?.detail ?? err?.message ?? 'Bir hata oluştu.');
    } finally {
      setQuickSubmitting(false);
    }
  };

  // --- Master Data Handlers ---
  const handleSaveCategory = async () => {
    if (!categoryForm.name || !categoryForm.base_uom) return alert('Lütfen zorunlu alanları doldurun.');
    try {
      if (editingCategory) {
        await updateItemCategory(editingCategory.id, categoryForm);
      } else {
        await createItemCategory(categoryForm);
      }
      setShowCategoryModal(false);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Kaydetme başarısız.');
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Silmek istediğinize emin misiniz?')) return;
    try {
      await deleteItemCategory(id);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Silme işlemi başarısız (büyük ihtimalle kullanılıyor).');
    }
  };

  const openCategoryModal = (cat?: ItemCategory) => {
    if (cat) {
      setEditingCategory(cat);
      setCategoryForm({ name: cat.name, base_uom: cat.base_uom, is_cuttable: cat.is_cuttable });
    } else {
      setEditingCategory(null);
      setCategoryForm({ name: '', base_uom: 'Adet', is_cuttable: false });
    }
    setShowCategoryModal(true);
  };

  const handleSaveLocation = async () => {
    if (!locationForm.name || !locationForm.location_type) return alert('Lütfen zorunlu alanları doldurun.');
    try {
      if (editingLocation) {
        await updateLocation(editingLocation.id, locationForm);
      } else {
        await createLocation(locationForm);
      }
      setShowLocationModal(false);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Kaydetme başarısız.');
    }
  };

  const handleDeleteLocation = async (id: number) => {
    if (!confirm('Silmek istediğinize emin misiniz?')) return;
    try {
      await deleteLocation(id);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Silme işlemi başarısız (büyük ihtimalle kullanılıyor).');
    }
  };

  const openLocationModal = (loc?: Location) => {
    if (loc) {
      setEditingLocation(loc);
      setLocationForm({ name: loc.name, location_type: loc.location_type, description: loc.description || '' });
    } else {
      setEditingLocation(null);
      setLocationForm({ name: '', location_type: 'WAREHOUSE', description: '' });
    }
    setShowLocationModal(true);
  };

  const handleSaveMaterialGrade = async () => {
    if (!materialGradeForm.name) return alert('Lütfen zorunlu alanları doldurun.');
    
    const compositionDict: Record<string, number> = {};
    for (const item of compositionList) {
      if (item.element.trim() && item.percentage !== '') {
        compositionDict[item.element.trim()] = Number(item.percentage);
      }
    }

    try {
      const payload = {
        name: materialGradeForm.name,
        composition: Object.keys(compositionDict).length > 0 ? compositionDict : undefined,
      };

      if (editingMaterialGrade) {
        await updateMaterialGrade(editingMaterialGrade.id, payload);
      } else {
        await createMaterialGrade(payload);
      }
      setShowMaterialGradeModal(false);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Kaydetme başarısız.');
    }
  };

  const handleDeleteMaterialGrade = async (id: number) => {
    if (!confirm('Silmek istediğinize emin misiniz?')) return;
    try {
      await deleteMaterialGrade(id);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Silme işlemi başarısız (büyük ihtimalle kullanılıyor).');
    }
  };

  const openMaterialGradeModal = (mg?: MaterialGrade) => {
    if (mg) {
      setEditingMaterialGrade(mg);
      setMaterialGradeForm({ name: mg.name });
      
      if (mg.composition && Object.keys(mg.composition).length > 0) {
        const list = Object.entries(mg.composition).map(([el, pct]) => ({ element: el, percentage: pct as number }));
        setCompositionList(list);
      } else {
        setCompositionList([{ element: '', percentage: '' }]);
      }
    } else {
      setEditingMaterialGrade(null);
      setMaterialGradeForm({ name: '' });
      setCompositionList([{ element: '', percentage: '' }]);
    }
    setShowMaterialGradeModal(true);
  };

  const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm";

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
        <h1 className="text-3xl font-bold text-gray-900">Stok Yönetimi</h1>
        <p className="text-gray-600 mt-1">Stok kalemleri, lotlar, işlem geçmişi ve master data yönetimi</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Navigation */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Operasyonlar</h2>
            </div>
            <nav className="flex flex-col p-2 space-y-1">
              <button onClick={() => setActiveTab('items')} className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'items' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                <Package className="w-4 h-4" /> Stok Kalemleri
              </button>
              <button onClick={() => setActiveTab('lots')} className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'lots' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                <Database className="w-4 h-4" /> Lotlar
              </button>
              <button onClick={() => setActiveTab('transactions')} className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'transactions' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                <ArrowRightLeft className="w-4 h-4" /> İşlem Geçmişi
              </button>
            </nav>

            <div className="p-4 border-b border-t border-gray-200 bg-gray-50">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Master Data</h2>
            </div>
            <nav className="flex flex-col p-2 space-y-1">
              <button onClick={() => setActiveTab('categories')} className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'categories' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                <Box className="w-4 h-4" /> Kategoriler
              </button>
              <button onClick={() => setActiveTab('locations')} className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'locations' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                <MapPin className="w-4 h-4" /> Lokasyonlar
              </button>
              <button onClick={() => setActiveTab('material_grades')} className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'material_grades' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                <Beaker className="w-4 h-4" /> Alaşımlar
              </button>
            </nav>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          {/* ITEMS TAB */}
          {activeTab === 'items' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Stok Kalemleri</h2>
                <button onClick={() => setShowItemForm(!showItemForm)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                  <Plus className="w-4 h-4" /> Yeni Stok Kalemi
                </button>
              </div>

              {showItemForm && (
                <form onSubmit={handleCreateItem} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Yeni Stok Kalemi Girişi (Hammadde)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Kategori *</label>
                      <select value={newItem.category_id} onChange={e => setNewItem({ ...newItem, category_id: e.target.value })} className={inputCls} required>
                        <option value="">Seçiniz</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Lot</label>
                      <select value={newItem.lot_id} onChange={e => setNewItem({ ...newItem, lot_id: e.target.value })} className={inputCls}>
                        <option value="">Lot Seçiniz (Opsiyonel)</option>
                        {lots.map(l => <option key={l.id} value={l.id}>{l.lot_number}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Lokasyon</label>
                      <select value={newItem.location_id} onChange={e => setNewItem({ ...newItem, location_id: e.target.value })} className={inputCls}>
                        <option value="">Lokasyon Seçiniz</option>
                        {[...locations]
                          .sort((a, b) => {
                            if (a.location_type === 'WAREHOUSE' && b.location_type !== 'WAREHOUSE') return -1;
                            if (a.location_type !== 'WAREHOUSE' && b.location_type === 'WAREHOUSE') return 1;
                            return a.name.localeCompare(b.name);
                          })
                          .map(l => (
                            <option key={l.id} value={l.id}>
                              {l.name} ({l.location_type === 'WAREHOUSE' ? 'Depo' : 'Üretim Alanı'})
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Miktar *</label>
                      <input type="number" step="0.01" value={newItem.quantity} onChange={e => setNewItem({ ...newItem, quantity: e.target.value })} className={inputCls} required />
                    </div>
                    <div className="col-span-1 md:col-span-2 border-l-2 border-blue-200 pl-4">
                      <p className="text-xs font-semibold text-gray-500 mb-2">ÖZELLİKLER (ATTRIBUTES)</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Çap (mm)</label>
                          <input type="number" value={newItem.attrDiameter} onChange={e => setNewItem({ ...newItem, attrDiameter: e.target.value })} className={inputCls} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Uzunluk (mm)</label>
                          <input type="number" value={newItem.attrLength} onChange={e => setNewItem({ ...newItem, attrLength: e.target.value })} className={inputCls} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end mt-6">
                    <button type="button" onClick={() => setShowItemForm(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">İptal</button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">Oluştur</button>
                  </div>
                </form>
              )}

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID / Tür</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategori & Lot</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lokasyon</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Özellikler</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Miktar</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {stockItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">#{item.id}</div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${item.item_type === 'RAW_MATERIAL' ? 'bg-purple-100 text-purple-800' :
                              item.item_type === 'WIP' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                            }`}>
                            {item.item_type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{item.category?.name || '-'}</div>
                          <div className="text-xs text-gray-500">Lot: {item.lot?.lot_number || '-'}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{item.location?.name || '-'}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {item.attributes ? Object.entries(item.attributes).map(([k, v]) => (
                              <span key={k} className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs border border-blue-200">
                                {k}: {v as string}
                              </span>
                            )) : <span className="text-gray-400 text-xs">-</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                          {Number(item.quantity).toFixed(2)} {item.category?.base_uom || ''}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {item.item_type === 'RAW_MATERIAL' && item.quantity > 0 && (
                            <button
                              onClick={() => {
                                setCutData({ parent_id: item.id, cut_quantity: '', cut_length: '', notes: '' });
                                setShowCutModal(true);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-md hover:bg-indigo-100 transition-colors text-xs font-medium border border-indigo-200"
                            >
                              <Scissors className="w-3 h-3" /> Kes
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {stockItems.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">Kayıt bulunamadı.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* LOTS TAB */}
          {activeTab === 'lots' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Lot Yönetimi</h2>
                <button onClick={() => setShowLotForm(!showLotForm)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                  <Plus className="w-4 h-4" /> Yeni Lot
                </button>
              </div>

              {showLotForm && (
                <form onSubmit={handleCreateLot} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Yeni Lot Girişi</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Lot No *</label>
                      <input type="text" value={newLot.lot_number} onChange={e => setNewLot({ ...newLot, lot_number: e.target.value })} className={inputCls} required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Sertifika No</label>
                      <input type="text" value={newLot.certificate_number} onChange={e => setNewLot({ ...newLot, certificate_number: e.target.value })} className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Giriş Tarihi *</label>
                      <input type="date" value={newLot.receive_date} onChange={e => setNewLot({ ...newLot, receive_date: e.target.value })} className={inputCls} required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Alaşım</label>
                      <select value={newLot.material_grade_id} onChange={e => setNewLot({ ...newLot, material_grade_id: e.target.value })} className={inputCls}>
                        <option value="">Seçiniz</option>
                        {materialGrades.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </div>
                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tedarikçi</label>
                      <div className="flex gap-2">
                        <select value={newLot.supplier_id} onChange={e => setNewLot({ ...newLot, supplier_id: e.target.value })} className={inputCls}>
                          <option value="">Seçiniz</option>
                          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <button type="button" onClick={() => setShowQuickSupplier(true)} className="px-3 py-2 border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 text-sm whitespace-nowrap">
                          + Yeni
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end mt-6">
                    <button type="button" onClick={() => setShowLotForm(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">İptal</button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">Oluştur</button>
                  </div>
                </form>
              )}

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lot No</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sertifika</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tedarikçi</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alaşım</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Giriş Tarihi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {lots.map((lot) => (
                      <tr key={lot.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{lot.lot_number}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{lot.certificate_number || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{lot.supplier?.name || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{lot.material_grade?.name || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{new Date(lot.receive_date).toLocaleDateString('tr-TR')}</td>
                      </tr>
                    ))}
                    {lots.length === 0 && (
                      <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">Kayıt bulunamadı.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TRANSACTIONS TAB */}
          {activeTab === 'transactions' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">İşlem Geçmişi</h2>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tür</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stok ID</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Değişim</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sonraki Miktar</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notlar / Meta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {transactions.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-600">{new Date(t.timestamp).toLocaleString('tr-TR')}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                            {t.transaction_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-blue-600">#{t.stock_item_id}</td>
                        <td className={`px-6 py-4 text-sm font-bold text-right ${Number(t.quantity_change) > 0 ? 'text-green-600' : Number(t.quantity_change) < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                          {Number(t.quantity_change) > 0 ? '+' : ''}{Number(t.quantity_change).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-right text-gray-900">{Number(t.quantity_after).toFixed(2)}</td>
                        <td className="px-6 py-4 text-xs text-gray-500 max-w-xs truncate">
                          {t.notes && <div className="text-gray-900 mb-1">{t.notes}</div>}
                          {t.meta_data && JSON.stringify(t.meta_data)}
                        </td>
                      </tr>
                    ))}
                    {transactions.length === 0 && (
                      <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">İşlem geçmişi bulunamadı.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CATEGORIES TAB */}
          {activeTab === 'categories' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Kategoriler</h2>
                <button onClick={() => openCategoryModal()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                  <Plus className="w-4 h-4" /> Yeni Kategori
                </button>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                      <th className="px-6 py-3 font-medium">ID</th>
                      <th className="px-6 py-3 font-medium">İsim</th>
                      <th className="px-6 py-3 font-medium">Birim</th>
                      <th className="px-6 py-3 font-medium">Kesilebilir mi?</th>
                      <th className="px-6 py-3 font-medium text-right">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {categories.map((cat) => (
                      <tr key={cat.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-500">{cat.id}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{cat.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{cat.base_uom}</td>
                        <td className="px-6 py-4 text-sm">
                          {cat.is_cuttable ? (
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">Evet</span>
                          ) : (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">Hayır</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-right space-x-2">
                          <button onClick={() => openCategoryModal(cat)} className="text-blue-600 hover:text-blue-800 p-1">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteCategory(cat.id)} className="text-red-600 hover:text-red-800 p-1">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {categories.length === 0 && (
                      <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">Kayıt bulunamadı.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* LOCATIONS TAB */}
          {activeTab === 'locations' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Lokasyonlar</h2>
                <button onClick={() => openLocationModal()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                  <Plus className="w-4 h-4" /> Yeni Lokasyon
                </button>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                      <th className="px-6 py-3 font-medium">ID</th>
                      <th className="px-6 py-3 font-medium">İsim</th>
                      <th className="px-6 py-3 font-medium">Tip</th>
                      <th className="px-6 py-3 font-medium">Açıklama</th>
                      <th className="px-6 py-3 font-medium text-right">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {locations.map((loc) => (
                      <tr key={loc.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-500">{loc.id}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{loc.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{loc.location_type}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{loc.description || '-'}</td>
                        <td className="px-6 py-4 text-sm text-right space-x-2">
                          {loc.location_type === 'WORK_CENTER' ? (
                            <div className="inline-flex items-center text-xs text-gray-400 gap-1 bg-gray-50 px-2 py-1 rounded">
                              <Lock className="w-3 h-3" /> Oto-Yönetim
                            </div>
                          ) : (
                            <>
                              <button onClick={() => openLocationModal(loc)} className="text-blue-600 hover:text-blue-800 p-1">
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDeleteLocation(loc.id)} className="text-red-600 hover:text-red-800 p-1">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                    {locations.length === 0 && (
                      <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">Kayıt bulunamadı.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MATERIAL GRADES TAB */}
          {activeTab === 'material_grades' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Alaşımlar</h2>
                <button onClick={() => openMaterialGradeModal()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                  <Plus className="w-4 h-4" /> Yeni Alaşım
                </button>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                      <th className="px-6 py-3 font-medium">ID</th>
                      <th className="px-6 py-3 font-medium">Alaşım İsmi</th>
                      <th className="px-6 py-3 font-medium">Kimyasal Kompozisyon</th>
                      <th className="px-6 py-3 font-medium text-right">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {materialGrades.map((mg) => (
                      <tr key={mg.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-500">{mg.id}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{mg.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {mg.composition && Object.keys(mg.composition).length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(mg.composition).map(([el, val]) => (
                                <span key={el} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs border border-gray-200">
                                  {el}: {val as number}%
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">Belirtilmemiş</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-right space-x-2">
                          <button onClick={() => openMaterialGradeModal(mg)} className="text-blue-600 hover:text-blue-800 p-1">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteMaterialGrade(mg.id)} className="text-red-600 hover:text-red-800 p-1">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {materialGrades.length === 0 && (
                      <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-500">Kayıt bulunamadı.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODALS */}
      {/* ========================================================= */}

      {/* CUT STEEL MODAL */}
      {showCutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Scissors className="w-5 h-5 text-indigo-600" />
              Çelik Kesme (WIP Oluştur)
            </h2>
            <form onSubmit={handleCutSteel}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kaynak Stok ID</label>
                  <input type="text" value={`#${cutData.parent_id}`} disabled className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kesilecek Miktar (kg) *</label>
                  <input type="number" step="0.01" value={cutData.cut_quantity} onChange={e => setCutData({ ...cutData, cut_quantity: e.target.value })} className={inputCls} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kesilen Parça Uzunluğu (mm) *</label>
                  <input type="number" step="0.1" value={cutData.cut_length} onChange={e => setCutData({ ...cutData, cut_length: e.target.value })} className={inputCls} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
                  <input type="text" value={cutData.notes} onChange={e => setCutData({ ...cutData, notes: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setShowCutModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium">İptal</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">Kesimi Tamamla</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK SUPPLIER MODAL */}
      {showQuickSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Hızlı Tedarikçi Ekle</h2>
            {quickError && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{quickError}</div>}
            <form onSubmit={handleQuickSupplierCreate}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Firma Adı *</label>
                  <input type="text" value={quickForm.name} onChange={e => setQuickForm({ ...quickForm, name: e.target.value })} className={inputCls} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vergi No</label>
                  <input type="text" value={quickForm.tax_no} onChange={e => setQuickForm({ ...quickForm, tax_no: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setShowQuickSupplier(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium">İptal</button>
                <button type="submit" disabled={quickSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50">Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {editingCategory ? 'Kategori Düzenle' : 'Yeni Kategori'}
            </h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">İsim *</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className={inputCls}
                  placeholder="Örn: Hammadde, Bitmiş Ürün..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Temel Birim (UoM) *</label>
                <input
                  type="text"
                  value={categoryForm.base_uom}
                  onChange={(e) => setCategoryForm({ ...categoryForm, base_uom: e.target.value })}
                  className={inputCls}
                  placeholder="kg, adet, m..."
                />
              </div>
              <div className="flex items-center gap-2 mt-4">
                <input
                  type="checkbox"
                  id="is_cuttable"
                  checked={categoryForm.is_cuttable}
                  onChange={(e) => setCategoryForm({ ...categoryForm, is_cuttable: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor="is_cuttable" className="text-sm font-medium text-gray-700">
                  Kesilebilir (Testere ile kesilip WIP oluşturulabilir mi?)
                </label>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowCategoryModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium text-sm">İptal</button>
              <button onClick={handleSaveCategory} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm">Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {/* Location Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {editingLocation ? 'Lokasyon Düzenle' : 'Yeni Lokasyon'}
            </h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">İsim *</label>
                <input
                  type="text"
                  value={locationForm.name}
                  onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                  className={inputCls}
                  placeholder="Ana Depo, Testere Alanı..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tip *</label>
                <select
                  value={locationForm.location_type}
                  onChange={(e) => setLocationForm({ ...locationForm, location_type: e.target.value })}
                  className={inputCls}
                >
                  <option value="WAREHOUSE">Depo (Warehouse)</option>
                  <option value="WORK_CENTER">Üretim Alanı (WorkCenter)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                <textarea
                  value={locationForm.description}
                  onChange={(e) => setLocationForm({ ...locationForm, description: e.target.value })}
                  className={inputCls}
                  rows={2}
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowLocationModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium text-sm">İptal</button>
              <button onClick={handleSaveLocation} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm">Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {/* Material Grade Modal */}
      {showMaterialGradeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 my-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {editingMaterialGrade ? 'Alaşım Düzenle' : 'Yeni Alaşım'}
            </h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alaşım İsmi *</label>
                <input
                  type="text"
                  value={materialGradeForm.name}
                  onChange={(e) => setMaterialGradeForm({ name: e.target.value })}
                  className={inputCls}
                  placeholder="Örn: 1.2344 (H13)"
                />
              </div>
              
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Kimyasal Kompozisyon (%)</label>
                  <button
                    onClick={() => setCompositionList([...compositionList, { element: '', percentage: '' }])}
                    className="text-xs text-blue-600 font-medium hover:text-blue-800 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Ekle
                  </button>
                </div>
                
                <div className="space-y-2">
                  {compositionList.map((item, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Element (C, Cr)"
                        value={item.element}
                        onChange={(e) => {
                          const newList = [...compositionList];
                          newList[index].element = e.target.value;
                          setCompositionList(newList);
                        }}
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent uppercase"
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Yüzde (%)"
                        value={item.percentage}
                        onChange={(e) => {
                          const newList = [...compositionList];
                          newList[index].percentage = e.target.value === '' ? '' : Number(e.target.value);
                          setCompositionList(newList);
                        }}
                        className="w-24 px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        onClick={() => {
                          const newList = compositionList.filter((_, i) => i !== index);
                          setCompositionList(newList.length ? newList : [{ element: '', percentage: '' }]);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  İsteğe bağlıdır. Element sembolü ve yüzde oranını girin.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowMaterialGradeModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium text-sm">İptal</button>
              <button onClick={handleSaveMaterialGrade} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm">Kaydet</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
