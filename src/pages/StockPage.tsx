import { useState, useEffect, useCallback } from 'react';
import { Package, Plus, Trash2, Scissors, Database, ArrowRightLeft, Settings, Pencil, Box, MapPin, Beaker, Lock } from 'lucide-react';
import {
  getStockItemsPaginated,
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
  getMaterialProfiles,
  createMaterialProfile,
  updateMaterialProfile,
  deleteMaterialProfile
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
  MaterialProfile,
  AttributeDefinition
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

  // --- Items Pagination & Filters ---
  const [itemsFilters, setItemsFilters] = useState({
    search: '',
    item_type: '',
    category_id: '',
    location_id: '',
    min_quantity: '',
    max_quantity: '',
    attributes_search: ''
  });
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsLoading, setItemsLoading] = useState(false);
  const LIMIT = 20;

  const fetchItems = useCallback(async (pageToFetch = 1) => {
    try {
      setItemsLoading(true);
      const currentSkip = (pageToFetch - 1) * LIMIT;
      const res = await getStockItemsPaginated({
        skip: currentSkip,
        limit: LIMIT,
        search: itemsFilters.search || undefined,
        item_type: itemsFilters.item_type || undefined,
        category_id: itemsFilters.category_id ? Number(itemsFilters.category_id) : undefined,
        location_id: itemsFilters.location_id ? Number(itemsFilters.location_id) : undefined,
        min_quantity: itemsFilters.min_quantity ? Number(itemsFilters.min_quantity) : undefined,
        max_quantity: itemsFilters.max_quantity ? Number(itemsFilters.max_quantity) : undefined,
        attributes_search: itemsFilters.attributes_search || undefined,
      });
      
      setStockItems(res.items);
      setTotalItems(res.total);
      setPage(pageToFetch);
    } catch (err) {
      console.error('Stok kalemleri yüklenemedi:', err);
    } finally {
      setItemsLoading(false);
    }
  }, [itemsFilters]);

  // Load items on filter change (reset to page 1)
  useEffect(() => {
    if (activeTab === 'items') {
      fetchItems(1);
    }
  }, [itemsFilters, activeTab, fetchItems]);


  // --- Data States ---
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [materialProfiles, setMaterialProfiles] = useState<MaterialProfile[]>([]);

  // --- UI States (Operations) ---
  const [showItemForm, setShowItemForm] = useState(false);
  const [showLotForm, setShowLotForm] = useState(false);
  const [showCutModal, setShowCutModal] = useState(false);
  const [showQuickSupplier, setShowQuickSupplier] = useState(false);

  // --- UI States (Master Data) ---
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showMaterialProfileModal, setShowMaterialProfileModal] = useState(false);

  // --- Edit states (Master Data) ---
  const [editingCategory, setEditingCategory] = useState<ItemCategory | null>(null);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [editingMaterialProfile, setEditingMaterialProfile] = useState<MaterialProfile | null>(null);

  // --- Form States (Operations) ---
  type NewItemState = {
    category_id: string;
    location_id: string;
    lot_id: string;
    quantity: string;
    block_count: string;
    attributes: Record<string, any>;
  };
  const [newItem, setNewItem] = useState<NewItemState>({
    category_id: '',
    location_id: '',
    lot_id: '',
    quantity: '',
    block_count: '1',
    attributes: {}
  });

  const [newLot, setNewLot] = useState({
    lot_number: '',
    certificate_number: '',
    supplier_id: '',
    material_profile_id: '',
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
  type CategoryFormState = {
    name: string;
    base_uom: string;
    is_cuttable: boolean;
    attributes_schema: AttributeDefinition[];
    tracking_schema: AttributeDefinition[];
  };
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>({ name: '', base_uom: 'Adet', is_cuttable: false, attributes_schema: [], tracking_schema: [] });
  const [locationForm, setLocationForm] = useState({ name: '', location_type: 'WAREHOUSE', description: '' });
  const [materialProfileForm, setMaterialProfileForm] = useState<{ category_id: string, display_name: string, attributes: Record<string, any> }>({ category_id: '', display_name: '', attributes: {} });
  const [compositionList, setCompositionList] = useState<{ element: string; percentage: number | '' }[]>([
    { element: '', percentage: '' },
  ]);

  // --- Data Loading ---
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [lotsData, transData, suppData, catData, profileData, locData] = await Promise.all([
        getLots(),
        getStockTransactions(),
        getSuppliers({ active: true }),
        getItemCategories(),
        getMaterialProfiles(),
        getLocations()
      ]);
      
      setLots(lotsData);
      setTransactions(transData);
      setSuppliers(suppData);
      setCategories(catData);
      setMaterialProfiles(profileData);
      setLocations(locData);
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(); fetchItems(1);
  }, [loadData]);

  // Compute total quantity for cuttable items dynamically based on weight attribute
  useEffect(() => {
    const cat = categories.find(c => c.id === Number(newItem.category_id));
    if (cat?.is_cuttable) {
      const weightKey = cat.tracking_schema?.find(a => 
        a.name.toLowerCase().includes('agirlik') || 
        a.name.toLowerCase().includes('ağırlık') || 
        a.name.toLowerCase().includes('weight') ||
        a.label.toLowerCase().includes('agirlik') ||
        a.label.toLowerCase().includes('ağırlık')
      )?.name;
      
      if (weightKey && newItem.attributes[weightKey]) {
         const calculated = (Number(newItem.attributes[weightKey]) * (Number(newItem.block_count) || 1)).toString();
         if (calculated !== newItem.quantity) {
           setNewItem(prev => ({ ...prev, quantity: calculated }));
         }
      }
    }
  }, [newItem.attributes, newItem.block_count, newItem.category_id, categories]);

  // --- Operations Handlers ---
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const attributes = { ...newItem.attributes };
      // Convert number strings to actual numbers where appropriate (e.g. based on schema)
      const category = categories.find(c => c.id === Number(newItem.category_id));
      if (category && category.tracking_schema) {
        for (const attrDef of category.tracking_schema) {
          if (attrDef.type === 'number' && attributes[attrDef.name]) {
            attributes[attrDef.name] = Number(attributes[attrDef.name]);
          }
        }
      }

      const count = (category?.is_cuttable && Number(newItem.block_count) > 0) ? Number(newItem.block_count) : 1;
      
      const payload = {
        item_type: 'RAW_MATERIAL' as const,
        category_id: Number(newItem.category_id),
        location_id: newItem.location_id ? Number(newItem.location_id) : null,
        lot_id: newItem.lot_id ? Number(newItem.lot_id) : null,
        quantity: Number(newItem.quantity) / count, // DB quantity is per item
        attributes: Object.keys(attributes).length > 0 ? attributes : undefined
      };

      const promises = [];
      for (let i = 0; i < count; i++) {
        promises.push(createStockItem(payload));
      }
      await Promise.all(promises);

      setNewItem({
        category_id: '', location_id: '', lot_id: '', quantity: '', block_count: '1',
        attributes: {}
      });
      setShowItemForm(false);
      loadData(); fetchItems(1);
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
        material_profile_id: newLot.material_profile_id ? Number(newLot.material_profile_id) : null,
        receive_date: newLot.receive_date
      }, lotCertificateFiles);

      setNewLot({
        lot_number: '', certificate_number: '', supplier_id: '',
        material_profile_id: '', receive_date: new Date().toISOString().split('T')[0]
      });
      setLotCertificateFiles([]);
      setShowLotForm(false);
      loadData(); fetchItems(1);
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
      loadData(); fetchItems(1);
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
      loadData(); fetchItems(1);
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Kaydetme başarısız.');
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Silmek istediğinize emin misiniz?')) return;
    try {
      await deleteItemCategory(id);
      loadData(); fetchItems(1);
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Silme işlemi başarısız (büyük ihtimalle kullanılıyor).');
    }
  };

  const openCategoryModal = (cat?: ItemCategory) => {
    if (cat) {
      setEditingCategory(cat);
      setCategoryForm({ name: cat.name, base_uom: cat.base_uom, is_cuttable: cat.is_cuttable, attributes_schema: cat.attributes_schema || [], tracking_schema: cat.tracking_schema || [] });
    } else {
      setEditingCategory(null);
      setCategoryForm({ name: '', base_uom: 'Adet', is_cuttable: false, attributes_schema: [], tracking_schema: [] });
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
      loadData(); fetchItems(1);
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Kaydetme başarısız.');
    }
  };

  const handleDeleteLocation = async (id: number) => {
    if (!confirm('Silmek istediğinize emin misiniz?')) return;
    try {
      await deleteLocation(id);
      loadData(); fetchItems(1);
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

  const handleSaveMaterialProfile = async () => {
    if (!materialProfileForm.display_name || !materialProfileForm.category_id) return alert('Lütfen zorunlu alanları doldurun.');
    
    try {
      const payload = {
        category_id: Number(materialProfileForm.category_id),
        display_name: materialProfileForm.display_name,
        attributes: materialProfileForm.attributes,
      };

      if (editingMaterialProfile) {
        await updateMaterialProfile(editingMaterialProfile.id, payload);
      } else {
        await createMaterialProfile(payload);
      }
      setShowMaterialProfileModal(false);
      loadData(); fetchItems(1);
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Kaydetme başarısız.');
    }
  };

  const handleDeleteMaterialProfile = async (id: number) => {
    if (!confirm('Silmek istediğinize emin misiniz?')) return;
    try {
      await deleteMaterialProfile(id);
      loadData(); fetchItems(1);
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Silme işlemi başarısız (büyük ihtimalle kullanılıyor).');
    }
  };

  const openMaterialProfileModal = (mp?: MaterialProfile) => {
    if (mp) {
      setEditingMaterialProfile(mp);
      setMaterialProfileForm({ 
          category_id: String(mp.category_id), 
          display_name: mp.display_name, 
          attributes: mp.attributes || {} 
      });
    } else {
      setEditingMaterialProfile(null);
      setMaterialProfileForm({ category_id: '', display_name: '', attributes: {} });
    }
    setShowMaterialProfileModal(true);
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
                <Beaker className="w-4 h-4" /> Malzeme Tanımları
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


              {/* Filters */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Arama (ID/Lot)</label>
                    <input type="text" value={itemsFilters.search} onChange={e => setItemsFilters({...itemsFilters, search: e.target.value})} className={inputCls} placeholder="ID veya Lot No..." />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Tip</label>
                    <select value={itemsFilters.item_type} onChange={e => setItemsFilters({...itemsFilters, item_type: e.target.value})} className={inputCls}>
                      <option value="">Tümü</option>
                      <option value="RAW_MATERIAL">Hammadde</option>
                      <option value="WIP">Yarı Mamul (WIP)</option>
                      <option value="FINISHED_GOOD">Mamul</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Kategori</label>
                    <select value={itemsFilters.category_id} onChange={e => setItemsFilters({...itemsFilters, category_id: e.target.value})} className={inputCls}>
                      <option value="">Tümü</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Lokasyon</label>
                    <select value={itemsFilters.location_id} onChange={e => setItemsFilters({...itemsFilters, location_id: e.target.value})} className={inputCls}>
                      <option value="">Tümü</option>
                      {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Min Miktar</label>
                    <input type="number" step="any" value={itemsFilters.min_quantity} onChange={e => setItemsFilters({...itemsFilters, min_quantity: e.target.value})} className={inputCls} placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Max Miktar</label>
                    <input type="number" step="any" value={itemsFilters.max_quantity} onChange={e => setItemsFilters({...itemsFilters, max_quantity: e.target.value})} className={inputCls} placeholder="1000" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Özelliklerde Ara (Örn. çap, 120)</label>
                    <input type="text" value={itemsFilters.attributes_search} onChange={e => setItemsFilters({...itemsFilters, attributes_search: e.target.value})} className={inputCls} placeholder="Özellik metni..." />
                  </div>
                </div>
              </div>

              {showItemForm && (
                <form onSubmit={handleCreateItem} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Yeni Stok Kalemi Girişi (Hammadde)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Kategori *</label>
                      <select value={newItem.category_id} onChange={e => setNewItem({ ...newItem, category_id: e.target.value, lot_id: '' })} className={inputCls} required>
                        <option value="">Seçiniz</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Lot</label>
                      <select 
                        value={newItem.lot_id} 
                        onChange={e => setNewItem({ ...newItem, lot_id: e.target.value })} 
                        className={inputCls}
                        disabled={!newItem.category_id}
                      >
                        <option value="">Lot Seçiniz (Opsiyonel)</option>
                        {lots
                          .filter(l => !newItem.category_id || l.material_profile?.category_id === Number(newItem.category_id))
                          .map(l => (
                            <option key={l.id} value={l.id}>
                              {l.lot_number} {l.material_profile?.display_name ? `- ${l.material_profile.display_name}` : ''}
                            </option>
                          ))}
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
                    {(() => {
                      const selectedCategory = categories.find(c => c.id === Number(newItem.category_id));
                      const isCuttable = selectedCategory?.is_cuttable;
                      
                      return (
                        <>
                          {isCuttable && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Blok Adedi *</label>
                              <input type="number" step="1" min="1" value={newItem.block_count} onChange={e => setNewItem({ ...newItem, block_count: e.target.value })} className={inputCls} required />
                            </div>
                          )}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Toplam Miktar {selectedCategory ? `(${selectedCategory.base_uom})` : ''} *
                            </label>
                            <input 
                              type="number" 
                              step="0.01" 
                              value={newItem.quantity} 
                              onChange={e => !isCuttable && setNewItem({ ...newItem, quantity: e.target.value })} 
                              className={`${inputCls} ${isCuttable ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''}`} 
                              readOnly={isCuttable}
                              required 
                            />
                          </div>
                        </>
                      );
                    })()}
                    
                    {/* Display Lot Material Profile Attributes Read-Only */}
                    {(() => {
                      const selectedLot = lots.find(l => l.id === Number(newItem.lot_id));
                      if (!selectedLot || !selectedLot.material_profile) return null;
                      
                      return (
                        <div className="col-span-1 md:col-span-3 bg-blue-50 border border-blue-100 rounded-lg p-3 mt-2 flex flex-wrap gap-x-6 gap-y-2">
                          <p className="text-sm font-semibold text-blue-900 w-full mb-1">Malzeme Tanımı: {selectedLot.material_profile.display_name}</p>
                          {Object.entries(selectedLot.material_profile.attributes || {}).map(([key, val]) => (
                            <div key={key} className="text-sm">
                              <span className="text-blue-700 font-medium">{key}:</span> <span className="text-blue-900">{val}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {(() => {
                      const selectedCategory = categories.find(c => c.id === Number(newItem.category_id));
                      if (!selectedCategory || !selectedCategory.tracking_schema || selectedCategory.tracking_schema.length === 0) {
                        return null;
                      }
                      
                      return (
                        <div className="col-span-1 md:col-span-3 border-l-2 border-green-200 pl-4 mt-2">
                          <p className="text-xs font-semibold text-gray-500 mb-2">FİZİKSEL TAKİP ÖZELLİKLERİ</p>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {selectedCategory.tracking_schema.map((attr, idx) => (
                              <div key={idx}>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  {attr.label} {attr.required && '*'}
                                </label>
                                <input
                                  type={attr.type === 'number' ? 'number' : 'text'}
                                  step={attr.type === 'number' ? 'any' : undefined}
                                  value={newItem.attributes[attr.name] || ''}
                                  onChange={e => setNewItem({ 
                                    ...newItem, 
                                    attributes: { ...newItem.attributes, [attr.name]: e.target.value } 
                                  })}
                                  className={inputCls}
                                  required={attr.required}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tür</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Malzeme & Tedarikçi</th>
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
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            item.item_type === 'RAW_MATERIAL' ? 'bg-purple-100 text-purple-800' :
                            item.item_type === 'WIP' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {item.item_type === 'RAW_MATERIAL' ? 'Hammadde' : 
                             item.item_type === 'WIP' ? 'Yarı Mamul' : 
                             item.item_type === 'FINISHED_PRODUCT' ? 'Mamul' : item.item_type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {item.lot?.material_profile?.display_name || <span className="text-gray-400">Belirtilmemiş</span>}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Tedarikçi: {item.lot?.supplier?.name || '-'} | Lot: {item.lot?.lot_number || '-'}
                          </div>
                          
                          {/* WIP Context (Kalıp / Bileşen) */}
                          {item.item_type === 'WIP' && (item.attributes?.['Kalıp'] || item.attributes?.['Sipariş Türü']) && (
                            <div className="mt-2 flex flex-col gap-1">
                              {item.attributes['Kalıp'] && (
                                <span className="inline-flex items-center text-xs font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 w-max">
                                  Kalıp: {item.attributes['Kalıp'] as string} 
                                  {item.attributes['Bileşen'] ? ` / ${item.attributes['Bileşen']}` : ''}
                                </span>
                              )}
                              {item.attributes['Sipariş Türü'] && (
                                <span className="inline-flex items-center text-xs font-medium text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200 w-max">
                                  {item.attributes['Sipariş Türü'] as string}
                                </span>
                              )}
                            </div>
                          )}
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
                {itemsLoading && <div className="p-4 text-center text-sm text-gray-500">Yükleniyor...</div>}
                <div className="flex justify-between items-center p-4 border-t border-gray-200">
                  <span className="text-sm text-gray-700">
                    Toplam {totalItems} kayıttan {(page - 1) * LIMIT + 1} - {Math.min(page * LIMIT, totalItems)} arası gösteriliyor
                  </span>
                  <div className="flex space-x-2">
                    <button 
                      disabled={page === 1} 
                      onClick={() => fetchItems(page - 1)}
                      className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 text-sm"
                    >
                      Önceki
                    </button>
                    <button 
                      disabled={page * LIMIT >= totalItems} 
                      onClick={() => fetchItems(page + 1)}
                      className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 text-sm"
                    >
                      Sonraki
                    </button>
                  </div>
                </div>
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Malzeme Profili</label>
                      <select value={newLot.material_profile_id} onChange={e => setNewLot({ ...newLot, material_profile_id: e.target.value })} className={inputCls}>
                        <option value="">Seçiniz</option>
                        {materialProfiles.map(m => <option key={m.id} value={m.id}>{m.display_name}</option>)}
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Malzeme Tanımı</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Giriş Tarihi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {lots.map((lot) => (
                      <tr key={lot.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{lot.lot_number}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{lot.certificate_number || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{lot.supplier?.name || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{lot.material_profile?.display_name || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{new Date(lot.receive_date).toLocaleDateString('tr-TR')}</td>
                      </tr>
                    ))}
                    {lots.length === 0 && (
                      <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">Kayıt bulunamadı.</td></tr>
                    )}
                  </tbody>

                </table>
                {itemsLoading && <div className="p-4 text-center text-sm text-gray-500">Yükleniyor...</div>}
                <div className="flex justify-between items-center p-4 border-t border-gray-200">
                  <span className="text-sm text-gray-700">
                    Toplam {totalItems} kayıttan {(page - 1) * LIMIT + 1} - {Math.min(page * LIMIT, totalItems)} arası gösteriliyor
                  </span>
                  <div className="flex space-x-2">
                    <button 
                      disabled={page === 1} 
                      onClick={() => fetchItems(page - 1)}
                      className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 text-sm"
                    >
                      Önceki
                    </button>
                    <button 
                      disabled={page * LIMIT >= totalItems} 
                      onClick={() => fetchItems(page + 1)}
                      className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 text-sm"
                    >
                      Sonraki
                    </button>
                  </div>
                </div>
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
                {itemsLoading && <div className="p-4 text-center text-sm text-gray-500">Yükleniyor...</div>}
                <div className="flex justify-between items-center p-4 border-t border-gray-200">
                  <span className="text-sm text-gray-700">
                    Toplam {totalItems} kayıttan {(page - 1) * LIMIT + 1} - {Math.min(page * LIMIT, totalItems)} arası gösteriliyor
                  </span>
                  <div className="flex space-x-2">
                    <button 
                      disabled={page === 1} 
                      onClick={() => fetchItems(page - 1)}
                      className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 text-sm"
                    >
                      Önceki
                    </button>
                    <button 
                      disabled={page * LIMIT >= totalItems} 
                      onClick={() => fetchItems(page + 1)}
                      className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 text-sm"
                    >
                      Sonraki
                    </button>
                  </div>
                </div>
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
                {itemsLoading && <div className="p-4 text-center text-sm text-gray-500">Yükleniyor...</div>}
                <div className="flex justify-between items-center p-4 border-t border-gray-200">
                  <span className="text-sm text-gray-700">
                    Toplam {totalItems} kayıttan {(page - 1) * LIMIT + 1} - {Math.min(page * LIMIT, totalItems)} arası gösteriliyor
                  </span>
                  <div className="flex space-x-2">
                    <button 
                      disabled={page === 1} 
                      onClick={() => fetchItems(page - 1)}
                      className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 text-sm"
                    >
                      Önceki
                    </button>
                    <button 
                      disabled={page * LIMIT >= totalItems} 
                      onClick={() => fetchItems(page + 1)}
                      className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 text-sm"
                    >
                      Sonraki
                    </button>
                  </div>
                </div>
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
                {itemsLoading && <div className="p-4 text-center text-sm text-gray-500">Yükleniyor...</div>}
                <div className="flex justify-between items-center p-4 border-t border-gray-200">
                  <span className="text-sm text-gray-700">
                    Toplam {totalItems} kayıttan {(page - 1) * LIMIT + 1} - {Math.min(page * LIMIT, totalItems)} arası gösteriliyor
                  </span>
                  <div className="flex space-x-2">
                    <button 
                      disabled={page === 1} 
                      onClick={() => fetchItems(page - 1)}
                      className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 text-sm"
                    >
                      Önceki
                    </button>
                    <button 
                      disabled={page * LIMIT >= totalItems} 
                      onClick={() => fetchItems(page + 1)}
                      className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 text-sm"
                    >
                      Sonraki
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* MATERIAL GRADES TAB */}
          {activeTab === 'material_grades' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Malzeme Tanımları</h2>
                <button onClick={() => openMaterialProfileModal()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                  <Plus className="w-4 h-4" /> Yeni Tanım
                </button>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                      <th className="px-6 py-3 font-medium">ID</th>
                      <th className="px-6 py-3 font-medium">Tanım İsmi</th>
                      <th className="px-6 py-3 font-medium">Kategori</th>
                      <th className="px-6 py-3 font-medium">Özellikler</th>
                      <th className="px-6 py-3 font-medium text-right">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {materialProfiles.map((mp) => (
                      <tr key={mp.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-500">{mp.id}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{mp.display_name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{mp.category?.name || mp.category_id}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {mp.attributes && Object.keys(mp.attributes).length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(mp.attributes).map(([k, v]) => (
                                <span key={k} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs border border-gray-200">
                                  {k}: {String(v)}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">Belirtilmemiş</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-right space-x-2">
                          <button onClick={() => openMaterialProfileModal(mp)} className="text-blue-600 hover:text-blue-800 p-1">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteMaterialProfile(mp.id)} className="text-red-600 hover:text-red-800 p-1">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {materialProfiles.length === 0 && (
                      <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">Kayıt bulunamadı.</td></tr>
                    )}
                  </tbody>

                </table>
                {itemsLoading && <div className="p-4 text-center text-sm text-gray-500">Yükleniyor...</div>}
                <div className="flex justify-between items-center p-4 border-t border-gray-200">
                  <span className="text-sm text-gray-700">
                    Toplam {totalItems} kayıttan {(page - 1) * LIMIT + 1} - {Math.min(page * LIMIT, totalItems)} arası gösteriliyor
                  </span>
                  <div className="flex space-x-2">
                    <button 
                      disabled={page === 1} 
                      onClick={() => fetchItems(page - 1)}
                      className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 text-sm"
                    >
                      Önceki
                    </button>
                    <button 
                      disabled={page * LIMIT >= totalItems} 
                      onClick={() => fetchItems(page + 1)}
                      className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 text-sm"
                    >
                      Sonraki
                    </button>
                  </div>
                </div>
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

              {/* Dynamic Attributes Section */}
              <div className="mt-6 border-t border-gray-200 pt-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">Dinamik Özellikler (Opsiyonel)</label>
                  <button
                    type="button"
                    onClick={() => setCategoryForm({
                      ...categoryForm,
                      attributes_schema: [...(categoryForm.attributes_schema || []), { name: '', label: '', type: 'number', required: false }]
                    })}
                    className="text-blue-600 hover:text-blue-700 text-xs font-medium flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Ekle
                  </button>
                </div>
                {categoryForm.attributes_schema?.map((attr, idx) => (
                  <div key={idx} className="flex gap-2 items-center mb-2 bg-gray-50 p-2 rounded border border-gray-100">
                    <input
                      type="text"
                      placeholder="Key (örn: cap)"
                      value={attr.name}
                      onChange={(e) => {
                        const newAttrs = [...categoryForm.attributes_schema!];
                        newAttrs[idx].name = e.target.value;
                        setCategoryForm({ ...categoryForm, attributes_schema: newAttrs });
                      }}
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Etiket (örn: Çap)"
                      value={attr.label}
                      onChange={(e) => {
                        const newAttrs = [...categoryForm.attributes_schema!];
                        newAttrs[idx].label = e.target.value;
                        setCategoryForm({ ...categoryForm, attributes_schema: newAttrs });
                      }}
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                    <select
                      value={attr.type}
                      onChange={(e) => {
                        const newAttrs = [...categoryForm.attributes_schema!];
                        newAttrs[idx].type = e.target.value as 'text' | 'number';
                        setCategoryForm({ ...categoryForm, attributes_schema: newAttrs });
                      }}
                      className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                    >
                      <option value="number">Sayı</option>
                      <option value="text">Metin</option>
                    </select>
                    <label className="flex items-center gap-1 text-xs text-gray-600">
                      <input
                        type="checkbox"
                        checked={attr.required}
                        onChange={(e) => {
                          const newAttrs = [...categoryForm.attributes_schema!];
                          newAttrs[idx].required = e.target.checked;
                          setCategoryForm({ ...categoryForm, attributes_schema: newAttrs });
                        }}
                        className="rounded border-gray-300 text-blue-600"
                      />
                      Zorunlu
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const newAttrs = [...categoryForm.attributes_schema!];
                        newAttrs.splice(idx, 1);
                        setCategoryForm({ ...categoryForm, attributes_schema: newAttrs });
                      }}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {categoryForm.attributes_schema?.length === 0 && (
                  <p className="text-xs text-gray-500 italic text-center py-2">Henüz özellik eklenmedi.</p>
                )}
              </div>

              {/* Dynamic Tracking Schema Section */}
              <div className="mt-6 border-t border-gray-200 pt-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">Fiziksel Takip Özellikleri (Stok Kalemi İçin)</label>
                  <button
                    type="button"
                    onClick={() => setCategoryForm({
                      ...categoryForm,
                      tracking_schema: [...(categoryForm.tracking_schema || []), { name: '', label: '', type: 'number', required: false }]
                    })}
                    className="text-blue-600 hover:text-blue-700 text-xs font-medium flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Ekle
                  </button>
                </div>
                {categoryForm.tracking_schema?.map((attr, idx) => (
                  <div key={idx} className="flex gap-2 items-center mb-2 bg-gray-50 p-2 rounded border border-gray-100">
                    <input
                      type="text"
                      placeholder="Key (örn: initial_length_mm)"
                      value={attr.name}
                      onChange={(e) => {
                        const newAttrs = [...categoryForm.tracking_schema!];
                        newAttrs[idx].name = e.target.value;
                        setCategoryForm({ ...categoryForm, tracking_schema: newAttrs });
                      }}
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Etiket (örn: Başlangıç Boyu)"
                      value={attr.label}
                      onChange={(e) => {
                        const newAttrs = [...categoryForm.tracking_schema!];
                        newAttrs[idx].label = e.target.value;
                        setCategoryForm({ ...categoryForm, tracking_schema: newAttrs });
                      }}
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                    <select
                      value={attr.type}
                      onChange={(e) => {
                        const newAttrs = [...categoryForm.tracking_schema!];
                        newAttrs[idx].type = e.target.value as 'text' | 'number';
                        setCategoryForm({ ...categoryForm, tracking_schema: newAttrs });
                      }}
                      className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                    >
                      <option value="number">Sayı</option>
                      <option value="text">Metin</option>
                    </select>
                    <label className="flex items-center gap-1 text-xs text-gray-600">
                      <input
                        type="checkbox"
                        checked={attr.required}
                        onChange={(e) => {
                          const newAttrs = [...categoryForm.tracking_schema!];
                          newAttrs[idx].required = e.target.checked;
                          setCategoryForm({ ...categoryForm, tracking_schema: newAttrs });
                        }}
                        className="rounded border-gray-300 text-blue-600"
                      />
                      Zorunlu
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const newAttrs = [...categoryForm.tracking_schema!];
                        newAttrs.splice(idx, 1);
                        setCategoryForm({ ...categoryForm, tracking_schema: newAttrs });
                      }}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {categoryForm.tracking_schema?.length === 0 && (
                  <p className="text-xs text-gray-500 italic text-center py-2">Henüz özellik eklenmedi.</p>
                )}
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

      {/* Material Profile Modal */}
      {showMaterialProfileModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 my-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {editingMaterialProfile ? 'Tanım Düzenle' : 'Yeni Tanım'}
            </h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori *</label>
                <select
                  value={materialProfileForm.category_id}
                  onChange={(e) => {
                    setMaterialProfileForm({ ...materialProfileForm, category_id: e.target.value, attributes: {}, display_name: '' });
                  }}
                  className={inputCls}
                  required
                >
                  <option value="">Seçiniz</option>
                  {categories.map((c) => (
                    <option key={c.id} value={String(c.id)}>{c.name}</option>
                  ))}
                </select>
              </div>
              
              {materialProfileForm.category_id && (() => {
                const selectedCat = categories.find(c => String(c.id) === materialProfileForm.category_id);
                return selectedCat?.attributes_schema?.map((attr) => (
                  <div key={attr.name}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{attr.label} {attr.required && '*'}</label>
                    <input
                      type={attr.type === 'number' ? 'number' : 'text'}
                      value={materialProfileForm.attributes[attr.name] || ''}
                      onChange={(e) => {
                          const newAttrs = { ...materialProfileForm.attributes, [attr.name]: e.target.value };
                          
                          // Compute display name
                          const parts = selectedCat.attributes_schema!
                            .filter(s => newAttrs[s.name])
                            .map(s => {
                              let val = newAttrs[s.name];
                              if (s.name.toLowerCase().includes('cap') || s.name.toLowerCase().includes('çap') || s.label.toLowerCase().includes('çap')) {
                                return `${val} Ø`;
                              }
                              return val;
                            });
                          const newDisplayName = parts.join(' - ');

                          setMaterialProfileForm({ 
                            ...materialProfileForm, 
                            attributes: newAttrs,
                            display_name: newDisplayName
                          });
                      }}
                      className={inputCls}
                      required={attr.required}
                    />
                  </div>
                ));
              })()}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanım İsmi (Otomatik)</label>
                <input
                  type="text"
                  value={materialProfileForm.display_name}
                  readOnly
                  className={`${inputCls} bg-gray-50 text-gray-600 cursor-not-allowed`}
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button onClick={() => setShowMaterialProfileModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium text-sm">İptal</button>
              <button onClick={handleSaveMaterialProfile} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm">Kaydet</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
