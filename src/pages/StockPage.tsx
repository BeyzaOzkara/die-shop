import { useState, useEffect, useMemo, useCallback } from 'react';
import { Package, Plus, FileText, Trash2, Pencil, Truck, X, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import {
  getSteelStockItems,
  createSteelStockItem,
  getLots,
  createLot,
  getStockMovements, // 🔹 buraya taşındı
  deleteLot,
  updateLot,
} from '../services/stockService';
import {
  getSuppliers,
  createSupplier,
  type SupplierCreatePayload,
} from '../services/supplierService';
import type { SteelStockItem, Lot, StockMovement, Supplier } from '../types/database';
import { mediaUrl } from '../lib/media';

// --------------------------------------------
// Quick-create supplier form state
// --------------------------------------------
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
  const [activeTab, setActiveTab] = useState<'items' | 'lots' | 'movements'>('items');
  const [stockItems, setStockItems] = useState<SteelStockItem[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showItemForm, setShowItemForm] = useState(false);
  const [showLotForm, setShowLotForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const [lotFilters, setLotFilters] = useState({
    alloy: '',
    diameter_mm: '',
    supplier: '',
    certificate_number: '',
    only_with_remaining: false,
  });

  const lotTotals = useMemo(() => {
    const totalGross = lots.reduce((sum, lot) => sum + Number(lot.gross_weight_kg || 0), 0);
    const totalRemaining = lots.reduce((sum, lot) => sum + Number(lot.remaining_kg || 0), 0);

    return {
      totalGross,
      totalRemaining,
      count: lots.length,
    };
  }, [lots]);

  // ---- New Stock Item ----
  const [newItem, setNewItem] = useState({
    alloy: '',
    diameter_mm: '',
    description: '',
  });

  // ---- New Lot ----
  const [newLot, setNewLot] = useState({
    stock_item_id: '',
    certificate_number: '',
    // supplier: '',
    supplier_id: '',   // FK-based selection
    length_mm: '',
    gross_weight_kg: '',
    received_date: new Date().toISOString().split('T')[0],
  });

  // yeni: sertifika dosyaları (çoklu destek)
  const [lotCertificateFiles, setLotCertificateFiles] = useState<File[]>([]);

  // ---- Quick-create supplier modal ----
  const [showQuickSupplier, setShowQuickSupplier] = useState(false);
  const [quickForm, setQuickForm] = useState<SupplierCreatePayload>(EMPTY_SUPPLIER_FORM);
  const [quickSubmitting, setQuickSubmitting] = useState(false);
  const [quickError, setQuickError] = useState('');

  // ---- Edit Lot ----
  const [editingLot, setEditingLot] = useState<Lot | null>(null);
  const [editLotForm, setEditLotForm] = useState({
    stock_item_id: '',
    certificate_number: '',
    supplier_id: '',
    length_mm: '',
    gross_weight_kg: '',
    remaining_kg: '',
    received_date: '',
  });

  const loadLots = async () => {
    const params: any = {
      alloy: lotFilters.alloy || undefined,
      supplier: lotFilters.supplier || undefined,
      certificate_number: lotFilters.certificate_number || undefined,
      only_with_remaining: lotFilters.only_with_remaining || undefined,
      diameter_mm: lotFilters.diameter_mm ? Number(lotFilters.diameter_mm) : undefined,
    };

    const lotsData = await getLots(params);
    setLots(lotsData);
  };


  const openEditLot = (lot: Lot) => {
    setEditingLot(lot);
    setEditLotForm({
      stock_item_id: String(lot.stock_item_id ?? lot.stock_item?.id ?? ''),
      certificate_number: lot.certificate_number ?? '',
      supplier_id: String(lot.supplier_id ?? lot.supplier_ref?.id ?? ''), //lot.supplier ?? '',
      length_mm: String(lot.length_mm ?? ''),
      gross_weight_kg: String(lot.gross_weight_kg ?? ''),
      remaining_kg: String(lot.remaining_kg ?? ''),
      received_date: new Date(lot.received_date).toISOString().split('T')[0],
    });
  };

  const handleUpdateLot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLot) return;

    try {
      const selectedSupplierId = editLotForm.supplier_id ? Number(editLotForm.supplier_id) : undefined;
      const selectedSupplier = selectedSupplierId
        ? suppliers.find((s) => s.id === selectedSupplierId)
        : undefined;
      await updateLot(editingLot.id, {
        stock_item_id: Number(editLotForm.stock_item_id),
        certificate_number: editLotForm.certificate_number,
        supplier_id: selectedSupplierId,              // ✅ NEW
        supplier: selectedSupplier?.name ?? '',       // ✅ backward compat
        length_mm: Number(editLotForm.length_mm),
        gross_weight_kg: Number(editLotForm.gross_weight_kg),
        remaining_kg: Number(editLotForm.remaining_kg),
        received_date: editLotForm.received_date,
      });

      setEditingLot(null);
      loadData();
    } catch (error: any) {
      console.error('Lot güncellenemedi:', error);

      const msg =
        error?.response?.status === 409
          ? error?.response?.data?.detail || 'Bu lot bazı alanlarda güncellenemez.'
          : 'Lot güncellenirken bir hata oluştu.';

      alert(msg);
    }
  };


  const loadData = async () => {
    try {
      setLoading(true);

      // Çelik ürünler her tabda lazım (lot formunda dropdown için)
      const items = await getSteelStockItems();
      setStockItems(items);
      
      // Always fetch active suppliers (needed for lot form dropdown)
      const activeSuppliers = await getSuppliers({ active: true });
      setSuppliers(activeSuppliers);

      if (activeTab === 'lots') {
        await loadLots();
      } else if (activeTab === 'movements') {
        const movementsData = await getStockMovements();
        setMovements(movementsData);
      }
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const handleDeleteLot = async (lotId: number) => {
    const ok = window.confirm('Bu lotu silmek istediğine emin misin?');
    if (!ok) return;

    try {
      await deleteLot(lotId);
      loadData();
    } catch (error: any) {
      console.error('Lot silinemedi:', error);

      // Backend 409 gönderiyorsa kullanıcıya düzgün mesaj
      const msg =
        error?.response?.status === 409
          ? error?.response?.data?.detail || 'Bu lot kullanıldığı için silinemez.'
          : 'Lot silinirken bir hata oluştu.';

      alert(msg);
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createSteelStockItem({
        alloy: newItem.alloy,
        diameter_mm: Number(newItem.diameter_mm),
        description: newItem.description || undefined,
      });
      setNewItem({ alloy: '', diameter_mm: '', description: '' });
      setShowItemForm(false);
      loadData();
    } catch (error) {
      console.error('Çelik ürün oluşturulamadı:', error);
      alert('Çelik ürün oluşturulurken bir hata oluştu.');
    }
  };

  const handleCreateLot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const grossWeight = Number(newLot.gross_weight_kg);
      const selectedSupplierId = newLot.supplier_id ? Number(newLot.supplier_id) : undefined;
      const selectedSupplier = selectedSupplierId
        ? suppliers.find((s) => s.id === selectedSupplierId)
        : undefined;
      await createLot({
        stock_item_id: Number(newLot.stock_item_id),
        certificate_number: newLot.certificate_number,
        // supplier: newLot.supplier,
        // Keep supplier name string for backward compat; backend also resolves from supplier_id
        supplier: selectedSupplier?.name ?? '',
        supplier_id: selectedSupplierId,
        length_mm: Number(newLot.length_mm),
        gross_weight_kg: grossWeight,
        remaining_kg: grossWeight,
        received_date: newLot.received_date,
      }, 
      lotCertificateFiles,
    );

      setNewLot({
        stock_item_id: '',
        certificate_number: '',
        // supplier: '',
        supplier_id: '',
        length_mm: '',
        gross_weight_kg: '',
        received_date: new Date().toISOString().split('T')[0],
      });
      setLotCertificateFiles([]);
      setShowLotForm(false);
      loadData();
    } catch (error) {
      console.error('Lot oluşturulamadı:', error);
      alert('Lot oluşturulurken bir hata oluştu.');
    }
  };

  
  // ---- Quick-create supplier ----
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
        contact_name: quickForm.contact_name?.trim() || undefined,
        phone: quickForm.phone?.trim() || undefined,
        email: quickForm.email?.trim() || undefined,
        address: quickForm.address?.trim() || undefined,
        notes: quickForm.notes?.trim() || undefined,
      });

      // Refresh supplier list
      const updated = await getSuppliers({ active: true });
      setSuppliers(updated);

      // if edit modal is open, select supplier there; else select in create form
      if (editingLot) {
        setEditLotForm((prev) => ({ ...prev, supplier_id: String(created.id) }));
      } else {
        setNewLot((prev) => ({ ...prev, supplier_id: String(created.id) }));
      }
      // Auto-select the newly created supplier
      // setNewLot((prev) => ({ ...prev, supplier_id: String(created.id) }));
      setShowQuickSupplier(false);
      setQuickForm(EMPTY_SUPPLIER_FORM);
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail ?? err?.message ?? 'Bir hata oluştu.';
      setQuickError(detail);
    } finally {
      setQuickSubmitting(false);
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
        <h1 className="text-3xl font-bold text-gray-900">Stok Yönetimi</h1>
        <p className="text-gray-600 mt-1">Çelik ürünleri, lotları ve hareketleri yönetin</p>
      </div>

      {/* TABLAR */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('items')}
            className={`pb-4 px-1 border-b-2 font-medium transition-colors ${
              activeTab === 'items'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Çelik Ürünler
          </button>
          <button
            onClick={() => setActiveTab('lots')}
            className={`pb-4 px-1 border-b-2 font-medium transition-colors ${
              activeTab === 'lots'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Lotlar
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`pb-4 px-1 border-b-2 font-medium transition-colors ${
              activeTab === 'movements'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Stok Hareketleri
          </button>
        </nav>
      </div>

      {/* ÇELİK ÜRÜNLER */}
      {activeTab === 'items' && (
        <div>
          <div className="flex justify-end mb-6">
            <button
              onClick={() => setShowItemForm(!showItemForm)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Yeni Çelik Ürün
            </button>
          </div>

          {showItemForm && (
            <form
              onSubmit={handleCreateItem}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Yeni Çelik Ürün</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Alaşım *</label>
                  <input
                    type="text"
                    value={newItem.alloy}
                    onChange={(e) => setNewItem({ ...newItem, alloy: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Çap (mm) *</label>
                  <input
                    type="number"
                    value={newItem.diameter_mm}
                    onChange={(e) => setNewItem({ ...newItem, diameter_mm: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                  <input
                    type="text"
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowItemForm(false)}
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

          {stockItems.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz çelik ürün yok</h3>
              <p className="text-gray-600">Yukarıdaki butonu kullanarak yeni ürün ekleyin</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Alaşım
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Çap (mm)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Açıklama
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {stockItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.alloy}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Ø{item.diameter_mm}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{item.description || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* LOTLAR */}
      {activeTab === 'lots' && (
        <div>
          <div className="flex flex-col gap-3 mb-6">
            <div className="flex justify-end">
              <button
                onClick={() => setShowLotForm(!showLotForm)}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Yeni Lot
              </button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Alaşım</label>
                  <input
                    value={lotFilters.alloy}
                    onChange={(e) => setLotFilters({ ...lotFilters, alloy: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="örn. 6063"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Çap (mm)</label>
                  <input
                    type="number"
                    value={lotFilters.diameter_mm}
                    onChange={(e) => setLotFilters({ ...lotFilters, diameter_mm: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="örn. 178"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tedarikçi</label>
                  <input
                    value={lotFilters.supplier}
                    onChange={(e) => setLotFilters({ ...lotFilters, supplier: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="örn. Erdemir"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Sertifika No</label>
                  <input
                    value={lotFilters.certificate_number}
                    onChange={(e) => setLotFilters({ ...lotFilters, certificate_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="örn. CERT-2026..."
                  />
                </div>

                <div className="flex items-end gap-3">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={lotFilters.only_with_remaining}
                      onChange={(e) => setLotFilters({ ...lotFilters, only_with_remaining: e.target.checked })}
                    />
                    Sadece kalan &gt; 0
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-3">
                <button
                  type="button"
                  onClick={loadLots}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Ara
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLotFilters({
                      alloy: '',
                      diameter_mm: '',
                      supplier: '',
                      certificate_number: '',
                      only_with_remaining: false,
                    });
                    // reset sonrası tüm lotları yükle
                    setTimeout(() => loadLots(), 0);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Temizle
                </button>
              </div>
            </div>
          </div>

          {/* LOT DÜZENLE MODAL */}
          {editingLot && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
              <div className="bg-white w-full max-w-2xl rounded-xl shadow-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Lot Düzenle — {editingLot.certificate_number}
                  </h3>
                  <button
                    onClick={() => setEditingLot(null)}
                    className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50"
                  >
                    Kapat
                  </button>
                </div>

                <form onSubmit={handleUpdateLot}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Çelik Ürün *</label>
                      <select
                        value={editLotForm.stock_item_id}
                        onChange={(e) =>
                          setEditLotForm({ ...editLotForm, stock_item_id: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="">Seçiniz</option>
                        {stockItems.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.alloy} - Ø{item.diameter_mm}mm
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Sertifika No *</label>
                      <input
                        type="text"
                        value={editLotForm.certificate_number}
                        onChange={(e) =>
                          setEditLotForm({ ...editLotForm, certificate_number: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tedarikçi <span className="text-red-500">*</span>
                      </label>

                      <div className="flex gap-2">
                        <select
                          value={editLotForm.supplier_id}
                          onChange={(e) => setEditLotForm({ ...editLotForm, supplier_id: e.target.value })}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        >
                          <option value="">Tedarikçi seçiniz</option>
                          {suppliers.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => {
                            setQuickForm(EMPTY_SUPPLIER_FORM);
                            setQuickError('');
                            setShowQuickSupplier(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap"
                        >
                          <Truck className="w-4 h-4" />
                          + Yeni Tedarikçi
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Uzunluk (mm) *</label>
                      <input
                        type="number"
                        value={editLotForm.length_mm}
                        onChange={(e) => setEditLotForm({ ...editLotForm, length_mm: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Brüt Ağırlık (kg) *</label>
                      <input
                        type="number"
                        value={editLotForm.gross_weight_kg}
                        onChange={(e) =>
                          setEditLotForm({ ...editLotForm, gross_weight_kg: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        step="0.01"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Kalan (kg) *</label>
                      <input
                        type="number"
                        value={editLotForm.remaining_kg}
                        onChange={(e) =>
                          setEditLotForm({ ...editLotForm, remaining_kg: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        step="0.01"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Giriş Tarihi *</label>
                      <input
                        type="date"
                        value={editLotForm.received_date}
                        onChange={(e) =>
                          setEditLotForm({ ...editLotForm, received_date: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => setEditingLot(null)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Kaydet
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {showLotForm && (
            <form
              onSubmit={handleCreateLot}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Yeni Lot</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Çelik Ürün *</label>
                  <select
                    value={newLot.stock_item_id}
                    onChange={(e) => setNewLot({ ...newLot, stock_item_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Seçiniz</option>
                    {stockItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.alloy} - Ø{item.diameter_mm}mm
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sertifika No *</label>
                  <input
                    type="text"
                    value={newLot.certificate_number}
                    onChange={(e) => setNewLot({ ...newLot, certificate_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tedarikçi <span className="text-red-500">*</span>
                </label>

                <div className="flex gap-2">
                  <select
                    value={newLot.supplier_id}
                    onChange={(e) => setNewLot({ ...newLot, supplier_id: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Tedarikçi seçiniz</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      setQuickForm(EMPTY_SUPPLIER_FORM);
                      setQuickError('');
                      setShowQuickSupplier(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap"
                  >
                    <Truck className="w-4 h-4" />
                    + Yeni Tedarikçi
                  </button>
                </div>
              </div>

              {/* Giriş Tarihi */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Giriş Tarihi <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={newLot.received_date}
                  onChange={(e) => setNewLot({ ...newLot, received_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
                

                {/* Uzunluk */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Uzunluk (mm) *</label>
                  <input
                    type="number"
                    value={newLot.length_mm}
                    onChange={(e) => setNewLot({ ...newLot, length_mm: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    step="0.01"
                    required
                  />
                </div>

                {/* Brüt Ağırlık */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brüt Ağırlık (kg) *</label>
                  <input
                    type="number"
                    value={newLot.gross_weight_kg}
                    onChange={(e) => setNewLot({ ...newLot, gross_weight_kg: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    step="0.01"
                    required
                  />
                </div>

                {/* Sertifika dosyası upload */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sertifika Dosyası</label>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? []);
                      setLotCertificateFiles(files);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />

                  {lotCertificateFiles.length > 0 && (
                    <div className="mt-2 text-sm text-gray-600">
                      <div className="font-medium text-gray-700 mb-1">Seçilen dosyalar:</div>
                      <ul className="list-disc pl-5">
                        {lotCertificateFiles.map((f, idx) => (
                          <li key={`${f.name}-${idx}`}>
                            {f.name}{' '}
                            <span className="text-gray-400">({Math.round(f.size / 1024)} KB)</span>
                          </li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        onClick={() => setLotCertificateFiles([])}
                        className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                      >
                        Dosyaları Temizle
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowLotForm(false);
                    setLotCertificateFiles([]);
                  }}
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

          {/* Lot toplamları */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="text-sm text-gray-500">Lot Sayısı</div>
              <div className="text-2xl font-bold text-gray-900">
                {lotTotals.count}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="text-sm text-gray-500">Toplam Brüt (kg)</div>
              <div className="text-2xl font-bold text-gray-900">
                {lotTotals.totalGross.toFixed(2)} kg
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="text-sm text-gray-500">Toplam Kalan (kg)</div>
              <div
                className={`text-2xl font-bold ${
                  lotTotals.totalRemaining > 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {lotTotals.totalRemaining.toFixed(2)} kg
              </div>
            </div>
          </div>

          {lots.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz lot yok</h3>
              <p className="text-gray-600">Yukarıdaki butonu kullanarak yeni lot ekleyin</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sertifika No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ürün
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tedarikçi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Brüt Ağırlık
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kalan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Giriş Tarihi
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dosyalar
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İşlemler
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {lots.map((lot) => (
                    <tr key={lot.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {lot.certificate_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {lot.stock_item?.alloy} - Ø{lot.stock_item?.diameter_mm}mm
                      </td>
                      {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{lot.supplier}</td> */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {/* Prefer linked supplier name, fall back to legacy string */}
                        {lot.supplier_ref?.name ?? lot.supplier}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {Number(lot.gross_weight_kg).toFixed(2)} kg
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={
                            Number(lot.remaining_kg) > 0 ? 'text-green-600 font-medium' : 'text-red-600'
                          }
                        >
                          {Number(lot.remaining_kg).toFixed(2)} kg
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(lot.received_date).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {lot.files && lot.files.length > 0 ? (
                          <div className="flex items-center gap-2">
                            {lot.files.map((f) => (
                              <a
                                key={f.id}
                                href={mediaUrl(f.storage_path)}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={f.original_name}   // hover tooltip
                                className="text-blue-600 hover:text-blue-800 transition-colors"
                              >
                                <FileText className="w-5 h-5" />
                              </a>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        <button
                          onClick={() => openEditLot(lot)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                          title="Lotu Düzenle"
                        >
                          <Pencil className="w-4 h-4" />
                          Düzenle
                        </button>
                        <button
                          onClick={() => handleDeleteLot(lot.id)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                          title="Lotu Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                          Sil
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* STOK HAREKETLERİ */}
      {activeTab === 'movements' && (
        <div>
          {movements.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz hareket yok</h3>
              <p className="text-gray-600">İş emirleri tamamlandığında stok hareketleri burada görünecektir</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tarih
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İş Emri
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bileşen
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lot
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Miktar
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {movements.map((movement) => (
                    <tr key={movement.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(movement.movement_date).toLocaleString('tr-TR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {movement.work_order?.order_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {movement.work_order?.die_component?.component_type?.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {movement.lot?.certificate_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                        -{Number(movement.quantity_kg).toFixed(2)} kg
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      
      {/* ========================================
          QUICK-CREATE SUPPLIER MODAL
          ======================================== */}
      {showQuickSupplier && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold text-gray-900">Yeni Tedarikçi</h2>
              </div>
              <button
                onClick={() => {
                  setShowQuickSupplier(false);
                  setQuickForm(EMPTY_SUPPLIER_FORM);
                  setQuickError('');
                }}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleQuickSupplierCreate} className="p-6 space-y-4">
              {quickError && (
                <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">
                  {quickError}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tedarikçi Adı <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={quickForm.name ?? ''}
                  onChange={(e) => setQuickForm({ ...quickForm, name: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="ör. Çelik Metal A.Ş."
                  required
                  autoFocus
                />
              </div>

              {/* Two-col */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vergi No</label>
                  <input
                    type="text"
                    value={quickForm.tax_no ?? ''}
                    onChange={(e) => setQuickForm({ ...quickForm, tax_no: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="ör. 1234567890"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">İletişim Kişisi</label>
                  <input
                    type="text"
                    value={quickForm.contact_name ?? ''}
                    onChange={(e) => setQuickForm({ ...quickForm, contact_name: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="ör. Ahmet Yılmaz"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                  <input
                    type="tel"
                    value={quickForm.phone ?? ''}
                    onChange={(e) => setQuickForm({ ...quickForm, phone: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+90 532 000 00 00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
                  <input
                    type="email"
                    value={quickForm.email ?? ''}
                    onChange={(e) => setQuickForm({ ...quickForm, email: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="info@firma.com"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickSupplier(false);
                    setQuickForm(EMPTY_SUPPLIER_FORM);
                    setQuickError('');
                  }}
                  className="px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={quickSubmitting}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {quickSubmitting ? 'Kaydediliyor...' : 'Oluştur & Seç'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
