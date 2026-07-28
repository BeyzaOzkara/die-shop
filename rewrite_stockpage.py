import os

content = """import { useState, useEffect, useMemo, useCallback } from 'react';
import { Package, Plus, Trash2, Truck, Scissors, Database, FileText, ArrowRightLeft, SlidersHorizontal } from 'lucide-react';
import {
  getStockItems,
  createStockItem,
  getLots,
  createLot,
  getStockTransactions,
  cutSteel,
  getLocations,
  getItemCategories,
  getMaterialGrades
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

export function StockPage() {
  const [activeTab, setActiveTab] = useState<'items' | 'lots' | 'transactions'>('items');
  const [loading, setLoading] = useState(true);

  // --- Data States ---
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [materialGrades, setMaterialGrades] = useState<MaterialGrade[]>([]);

  // --- UI States ---
  const [showItemForm, setShowItemForm] = useState(false);
  const [showLotForm, setShowLotForm] = useState(false);
  const [showCutModal, setShowCutModal] = useState(false);
  const [showQuickSupplier, setShowQuickSupplier] = useState(false);

  // --- Form States ---
  const [newItem, setNewItem] = useState({
    category_id: '',
    location_id: '',
    lot_id: '',
    quantity: '',
    attrAlloy: '',
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

  // --- Handlers ---
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const attributes: Record<string, any> = {};
      if (newItem.attrAlloy) attributes.alloy = newItem.attrAlloy;
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
        attrAlloy: '', attrDiameter: '', attrLength: ''
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
        <h1 className="text-3xl font-bold text-gray-900">Stok Yönetimi (Yeni Nesil)</h1>
        <p className="text-gray-600 mt-1">Stok kalemleri, lotlar ve işlem geçmişi</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('items')}
            className={`pb-4 px-1 border-b-2 font-medium transition-colors ${
              activeTab === 'items' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Stok Kalemleri
          </button>
          <button
            onClick={() => setActiveTab('lots')}
            className={`pb-4 px-1 border-b-2 font-medium transition-colors ${
              activeTab === 'lots' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Lotlar
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`pb-4 px-1 border-b-2 font-medium transition-colors ${
              activeTab === 'transactions' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            İşlem Geçmişi
          </button>
        </nav>
      </div>

      {/* ITEMS TAB */}
      {activeTab === 'items' && (
        <div>
          <div className="flex justify-end mb-6">
            <button
              onClick={() => setShowItemForm(!showItemForm)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Yeni Stok Kalemi (Hammadde)
            </button>
          </div>

          {showItemForm && (
            <form onSubmit={handleCreateItem} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Yeni Stok Kalemi Girişi</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kategori *</label>
                  <select value={newItem.category_id} onChange={e => setNewItem({...newItem, category_id: e.target.value})} className={inputCls} required>
                    <option value="">Seçiniz</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lot</label>
                  <select value={newItem.lot_id} onChange={e => setNewItem({...newItem, lot_id: e.target.value})} className={inputCls}>
                    <option value="">Lot Seçiniz (Opsiyonel)</option>
                    {lots.map(l => <option key={l.id} value={l.id}>{l.lot_number}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lokasyon</label>
                  <select value={newItem.location_id} onChange={e => setNewItem({...newItem, location_id: e.target.value})} className={inputCls}>
                    <option value="">Lokasyon Seçiniz</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Miktar *</label>
                  <input type="number" step="0.01" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: e.target.value})} className={inputCls} required />
                </div>
                
                {/* JSONB Attributes Mapping */}
                <div className="col-span-1 md:col-span-2 border-l-2 border-blue-200 pl-4">
                  <p className="text-xs font-semibold text-gray-500 mb-2">ÖZELLİKLER (ATTRIBUTES)</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Alaşım</label>
                      <input type="text" value={newItem.attrAlloy} onChange={e => setNewItem({...newItem, attrAlloy: e.target.value})} className={inputCls} placeholder="Örn: H13" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Çap (mm)</label>
                      <input type="number" value={newItem.attrDiameter} onChange={e => setNewItem({...newItem, attrDiameter: e.target.value})} className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Uzunluk (mm)</label>
                      <input type="number" value={newItem.attrLength} onChange={e => setNewItem({...newItem, attrLength: e.target.value})} className={inputCls} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setShowItemForm(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg">İptal</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Oluştur</button>
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
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        item.item_type === 'RAW_MATERIAL' ? 'bg-purple-100 text-purple-800' :
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
                            {k}: {v}
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
          <div className="flex justify-end mb-6">
            <button
              onClick={() => setShowLotForm(!showLotForm)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Yeni Lot
            </button>
          </div>

          {showLotForm && (
            <form onSubmit={handleCreateLot} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Yeni Lot</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lot No *</label>
                  <input type="text" value={newLot.lot_number} onChange={e => setNewLot({...newLot, lot_number: e.target.value})} className={inputCls} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sertifika No</label>
                  <input type="text" value={newLot.certificate_number} onChange={e => setNewLot({...newLot, certificate_number: e.target.value})} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giriş Tarihi *</label>
                  <input type="date" value={newLot.receive_date} onChange={e => setNewLot({...newLot, receive_date: e.target.value})} className={inputCls} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Malzeme Kalitesi</label>
                  <select value={newLot.material_grade_id} onChange={e => setNewLot({...newLot, material_grade_id: e.target.value})} className={inputCls}>
                    <option value="">Seçiniz</option>
                    {materialGrades.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tedarikçi</label>
                  <div className="flex gap-2">
                    <select value={newLot.supplier_id} onChange={e => setNewLot({...newLot, supplier_id: e.target.value})} className={inputCls}>
                      <option value="">Seçiniz</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <button type="button" onClick={() => setShowQuickSupplier(true)} className="px-3 py-2 border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 text-sm whitespace-nowrap whitespace-nowrap">
                      + Yeni
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowLotForm(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg">İptal</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Oluştur</button>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Malzeme Kalitesi</th>
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
      )}

      {/* CUT STEEL MODAL */}
      {showCutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
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
                  <input type="number" step="0.01" value={cutData.cut_quantity} onChange={e => setCutData({...cutData, cut_quantity: e.target.value})} className={inputCls} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kesilen Parça Uzunluğu (mm) *</label>
                  <input type="number" step="0.1" value={cutData.cut_length} onChange={e => setCutData({...cutData, cut_length: e.target.value})} className={inputCls} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
                  <input type="text" value={cutData.notes} onChange={e => setCutData({...cutData, notes: e.target.value})} className={inputCls} />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setShowCutModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">İptal</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Kesimi Tamamla</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK SUPPLIER MODAL */}
      {showQuickSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Hızlı Tedarikçi Ekle</h2>
            {quickError && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{quickError}</div>}
            <form onSubmit={handleQuickSupplierCreate}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Firma Adı *</label>
                  <input type="text" value={quickForm.name} onChange={e => setQuickForm({...quickForm, name: e.target.value})} className={inputCls} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vergi No</label>
                  <input type="text" value={quickForm.tax_no} onChange={e => setQuickForm({...quickForm, tax_no: e.target.value})} className={inputCls} />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setShowQuickSupplier(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">İptal</button>
                <button type="submit" disabled={quickSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
"""

with open("src/pages/StockPage.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Rewrote StockPage.tsx")
