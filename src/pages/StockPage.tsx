import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Package, Plus, FileText, Trash2, Truck, X, ChevronUp, ChevronDown, ChevronsUpDown, SlidersHorizontal, Search, RotateCcw } from 'lucide-react';
import {
  getSteelStockItems,
  createSteelStockItem,
  getLots,
  createLot,
  getStockMovements,
  deleteLot,
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

// --------------------------------------------
// Lot sort key type
// --------------------------------------------
type LotSortKey =
  | 'certificate_number'
  | 'product'
  | 'supplier'
  | 'gross_weight_kg'
  | 'remaining_kg'
  | 'received_date';

type SortDir = 'asc' | 'desc';

// --------------------------------------------
// Default filter state
// --------------------------------------------
const DEFAULT_LOT_FILTERS = {
  text: '',
  stockItemId: '',
  supplierId: '',
  grossMin: '',
  grossMax: '',
  remainingMin: '',
  remainingMax: '',
  dateFrom: '',
  dateTo: '',
};

// --------------------------------------------
// Movement filter state
// --------------------------------------------
const DEFAULT_MOVEMENT_FILTERS = {
  search: '',
  dateFrom: '',
  dateTo: '',
};

const MOVEMENT_PAGE_SIZE = 30;

// --------------------------------------------
// Sort indicator component
// --------------------------------------------
function SortIcon({ col, sortKey, sortDir }: { col: LotSortKey; sortKey: LotSortKey | null; sortDir: SortDir }) {
  if (sortKey !== col) return <ChevronsUpDown className="w-3.5 h-3.5 ml-1 opacity-30 inline" />;
  return sortDir === 'asc'
    ? <ChevronUp className="w-3.5 h-3.5 ml-1 text-blue-600 inline" />
    : <ChevronDown className="w-3.5 h-3.5 ml-1 text-blue-600 inline" />;
}

export function StockPage() {
  const [activeTab, setActiveTab] = useState<'items' | 'lots' | 'movements'>('items');
  const [stockItems, setStockItems] = useState<SteelStockItem[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showItemForm, setShowItemForm] = useState(false);
  const [showLotForm, setShowLotForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);

  // ---- Stock Movement states for infinite scroll ----
  const [movementFilters, setMovementFilters] = useState(DEFAULT_MOVEMENT_FILTERS);
  const [movementsTotal, setMovementsTotal] = useState(0);
  const [movementsSkip, setMovementsSkip] = useState(0);
  const [movementsLoadingMore, setMovementsLoadingMore] = useState(false);
  const [movementsInitialLoading, setMovementsInitialLoading] = useState(false);

  const movementsSentinelRef = useRef<HTMLDivElement | null>(null);
  const movementsObserverRef = useRef<IntersectionObserver | null>(null);

  // Stable refs to avoid stale closures in IntersectionObserver
  const movementsFiltersRef = useRef(movementFilters);
  const movementsSkipRef = useRef(0);
  movementsFiltersRef.current = movementFilters;
  movementsSkipRef.current = movementsSkip;

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
    supplier_id: '',   // FK-based selection
    length_mm: '',
    gross_weight_kg: '',
    received_date: new Date().toISOString().split('T')[0],
  });

  const [lotCertificateFiles, setLotCertificateFiles] = useState<File[]>([]);

  // ---- Quick-create supplier modal ----
  const [showQuickSupplier, setShowQuickSupplier] = useState(false);
  const [quickForm, setQuickForm] = useState<SupplierCreatePayload>(EMPTY_SUPPLIER_FORM);
  const [quickSubmitting, setQuickSubmitting] = useState(false);
  const [quickError, setQuickError] = useState('');

  // ---- Lot filters ----
  const [lotFilters, setLotFilters] = useState(DEFAULT_LOT_FILTERS);

  // ---- Lot sort ----
  const [sortKey, setSortKey] = useState<LotSortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // ---- Load ----
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [items, activeSuppliers, lotsData] = await Promise.all([
        getSteelStockItems(),
        getSuppliers({ active: true }),
        getLots(), // always fetch lots (needed for per-item totals on items tab)
      ]);
      setStockItems(items);
      setSuppliers(activeSuppliers);
      setLots(lotsData);

      // if (activeTab === 'movements') {
      //   const movementsData = await getStockMovements();
      //   setMovements(movementsData);
      // }
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  // }, [activeTab]);
  }, []);

  const fetchMovements = useCallback(async (currentSkip: number, currentFilters: typeof DEFAULT_MOVEMENT_FILTERS, replace: boolean) => {
    if (replace) {
      setMovementsInitialLoading(true);
    } else {
      setMovementsLoadingMore(true);
    }

    try {
      const res = await getStockMovements({
        skip: currentSkip,
        limit: MOVEMENT_PAGE_SIZE,
        search: currentFilters.search,
        date_from: currentFilters.dateFrom || undefined,
        date_to: currentFilters.dateTo || undefined,
      });

      setMovementsTotal(res.total);
      if (replace) {
        setMovements(res.items);
      } else {
        setMovements(prev => [...prev, ...res.items]);
      }
      setMovementsSkip(currentSkip + res.items.length);
    } catch (err) {
      console.error('Stok hareketleri yüklenemedi:', err);
    } finally {
      setMovementsInitialLoading(false);
      setMovementsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  
  // Handle movements tab loading and filters
  useEffect(() => {
    if (activeTab === 'movements') {
      setMovementsSkip(0);
      fetchMovements(0, movementFilters, true);
    }
  }, [activeTab, movementFilters, fetchMovements]);

  // Infinite scroll observer for movements
  useEffect(() => {
    if (activeTab !== 'movements') return;
    if (movementsObserverRef.current) movementsObserverRef.current.disconnect();

    movementsObserverRef.current = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !movementsLoadingMore &&
          !movementsInitialLoading &&
          movementsSkipRef.current < movementsTotal
        ) {
          fetchMovements(movementsSkipRef.current, movementsFiltersRef.current, false);
        }
      },
      { threshold: 0.1 }
    );

    if (movementsSentinelRef.current) {
      movementsObserverRef.current.observe(movementsSentinelRef.current);
    }

    return () => {
      if (movementsObserverRef.current) movementsObserverRef.current.disconnect();
    };
  }, [activeTab, movementsLoadingMore, movementsInitialLoading, movementsTotal, fetchMovements]);

  // ---- Sort handler ----
  const handleSort = useCallback((key: LotSortKey) => {
    setSortKey((prev) => {
      if (prev !== key) {
        setSortDir('asc');
        return key;
      } else if (sortDir === 'asc') {
        setSortDir('desc');
        return key;
      } else {
        // desc → clear
        setSortDir('asc');
        return null;
      }
    });
  }, [sortDir]);

  // ---- Handlers ----
  const handleDeleteLot = async (lotId: number) => {
    const ok = window.confirm('Bu lotu silmek istediğine emin misin?');
    if (!ok) return;
    try {
      await deleteLot(lotId);
      loadData();
    } catch (error: any) {
      console.error('Lot silinemedi:', error);
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

      await createLot(
        {
          stock_item_id: Number(newLot.stock_item_id),
          certificate_number: newLot.certificate_number,
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

      // Auto-select the newly created supplier
      setNewLot((prev) => ({ ...prev, supplier_id: String(created.id) }));
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

  // ---- Reset filters ----
  const handleResetFilters = useCallback(() => {
    setLotFilters(DEFAULT_LOT_FILTERS);
    setSortKey(null);
    setSortDir('asc');
  }, []);

  // ========================================================
  // MEMOS
  // ========================================================

  // Filtered lots
  const filteredLots = useMemo(() => {
    const {
      text, stockItemId, supplierId,
      grossMin, grossMax, remainingMin, remainingMax,
      dateFrom, dateTo,
    } = lotFilters;

    const lowerText = text.toLowerCase().trim();

    return lots.filter((lot) => {
      // Free text: certificate_number, alloy, diameter
      if (lowerText) {
        const haystack = [
          lot.certificate_number,
          lot.stock_item?.alloy ?? '',
          lot.stock_item ? `${lot.stock_item.diameter_mm}` : '',
          lot.stock_item ? `ø${lot.stock_item.diameter_mm}` : '',
        ].join(' ').toLowerCase();
        if (!haystack.includes(lowerText)) return false;
      }

      // Çelik Ürün
      if (stockItemId && String(lot.stock_item_id) !== stockItemId) return false;

      // Tedarikçi: prefer FK, fallback to legacy string match
      if (supplierId) {
        if (lot.supplier_id != null) {
          if (String(lot.supplier_id) !== supplierId) return false;
        } else {
          // Legacy: find supplier by id and compare name
          const sup = suppliers.find((s) => String(s.id) === supplierId);
          if (!sup) return false;
          if (!lot.supplier?.toLowerCase().includes(sup.name.toLowerCase())) return false;
        }
      }

      // Brüt ağırlık range
      const gross = Number(lot.gross_weight_kg);
      if (grossMin !== '' && gross < Number(grossMin)) return false;
      if (grossMax !== '' && gross > Number(grossMax)) return false;

      // Kalan range
      const remaining = Number(lot.remaining_kg);
      if (remainingMin !== '' && remaining < Number(remainingMin)) return false;
      if (remainingMax !== '' && remaining > Number(remainingMax)) return false;

      // Date range
      if (dateFrom && lot.received_date < dateFrom) return false;
      if (dateTo && lot.received_date > dateTo) return false;

      return true;
    });
  }, [lots, lotFilters, suppliers]);

  // Sorted lots
  const sortedLots = useMemo(() => {
    if (!sortKey) return filteredLots;

    return [...filteredLots].sort((a, b) => {
      let aVal: string | number = 0;
      let bVal: string | number = 0;

      switch (sortKey) {
        case 'certificate_number':
          aVal = a.certificate_number ?? '';
          bVal = b.certificate_number ?? '';
          break;
        case 'product':
          aVal = `${a.stock_item?.alloy ?? ''} ${a.stock_item?.diameter_mm ?? ''}`;
          bVal = `${b.stock_item?.alloy ?? ''} ${b.stock_item?.diameter_mm ?? ''}`;
          break;
        case 'supplier':
          aVal = (a.supplier_ref?.name ?? a.supplier ?? '').toLowerCase();
          bVal = (b.supplier_ref?.name ?? b.supplier ?? '').toLowerCase();
          break;
        case 'gross_weight_kg':
          aVal = Number(a.gross_weight_kg);
          bVal = Number(b.gross_weight_kg);
          break;
        case 'remaining_kg':
          aVal = Number(a.remaining_kg);
          bVal = Number(b.remaining_kg);
          break;
        case 'received_date':
          aVal = a.received_date ?? '';
          bVal = b.received_date ?? '';
          break;
      }

      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredLots, sortKey, sortDir]);

  // Lot totals
  const lotTotals = useMemo(() => {
    const totalGross = sortedLots.reduce((s, l) => s + Number(l.gross_weight_kg), 0);
    const totalRemaining = sortedLots.reduce((s, l) => s + Number(l.remaining_kg), 0);
    return { totalGross, totalRemaining, count: sortedLots.length };
  }, [sortedLots]);

  // Per stock-item totals (for items tab)
  const itemTotals = useMemo(() => {
    const map = new Map<number, { gross: number; remaining: number }>();
    for (const lot of lots) {
      const prev = map.get(lot.stock_item_id) ?? { gross: 0, remaining: 0 };
      map.set(lot.stock_item_id, {
        gross: prev.gross + Number(lot.gross_weight_kg),
        remaining: prev.remaining + Number(lot.remaining_kg),
      });
    }
    return map;
  }, [lots]);

  // Shared input class
  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent';

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
            className={`pb-4 px-1 border-b-2 font-medium transition-colors ${activeTab === 'items'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
          >
            Çelik Ürünler
          </button>
          <button
            onClick={() => setActiveTab('lots')}
            className={`pb-4 px-1 border-b-2 font-medium transition-colors ${activeTab === 'lots'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
          >
            Lotlar
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`pb-4 px-1 border-b-2 font-medium transition-colors ${activeTab === 'movements'
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
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Toplam Brüt (kg)
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Toplam Kalan (kg)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {stockItems.map((item) => {
                    const totals = itemTotals.get(item.id);
                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.alloy}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Ø{item.diameter_mm}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{item.description || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                          {totals ? `${totals.gross.toFixed(2)} kg` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                          {totals ? (
                            <span className={totals.remaining > 0 ? 'text-green-600' : 'text-red-500'}>
                              {totals.remaining.toFixed(2)} kg
                            </span>
                          ) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* LOTLAR */}
      {activeTab === 'lots' && (
        <div>
          <div className="flex justify-end gap-3 mb-6">
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-colors ${showFilters
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filtrele
            </button>
            <button
              onClick={() => setShowLotForm(!showLotForm)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Yeni Lot
            </button>
          </div>

          {showLotForm && (
            <form
              onSubmit={handleCreateLot}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Yeni Lot</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Çelik Ürün */}
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

                {/* Sertifika No */}
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

                {/* Tedarikçi Dropdown */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tedarikçi *</label>
                  <div className="flex items-center gap-2">
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
                      className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap"
                    >
                      <Truck className="w-4 h-4" />
                      + Yeni Tedarikçi
                    </button>
                  </div>
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

                {/* Giriş Tarihi */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giriş Tarihi *</label>
                  <input
                    type="date"
                    value={newLot.received_date}
                    onChange={(e) => setNewLot({ ...newLot, received_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Sertifika Dosyası */}
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

          {/* ======================================
              FILTER CARD
          ====================================== */}
          {showFilters && <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Filtreler</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleResetFilters}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Temizle
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
                  title="Filtreleri kapat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Row 1: text search + dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
              {/* Free text */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Arama (sertifika no, ürün...)</label>
                <input
                  type="text"
                  placeholder="ör. 6063, Ø152, CERT-001"
                  value={lotFilters.text}
                  onChange={(e) => setLotFilters((f) => ({ ...f, text: e.target.value }))}
                  className={inputCls}
                />
              </div>

              {/* Çelik Ürün */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Çelik Ürün</label>
                <select
                  value={lotFilters.stockItemId}
                  onChange={(e) => setLotFilters((f) => ({ ...f, stockItemId: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">Tümü</option>
                  {stockItems.map((item) => (
                    <option key={item.id} value={String(item.id)}>
                      {item.alloy} – Ø{item.diameter_mm}mm
                    </option>
                  ))}
                </select>
              </div>

              {/* Tedarikçi */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Tedarikçi</label>
                <select
                  value={lotFilters.supplierId}
                  onChange={(e) => setLotFilters((f) => ({ ...f, supplierId: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">Tümü</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: numeric ranges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Brüt Ağırlık min (kg)</label>
                <input
                  type="number"
                  placeholder="0"
                  min="0"
                  step="0.01"
                  value={lotFilters.grossMin}
                  onChange={(e) => setLotFilters((f) => ({ ...f, grossMin: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Brüt Ağırlık max (kg)</label>
                <input
                  type="number"
                  placeholder="∞"
                  min="0"
                  step="0.01"
                  value={lotFilters.grossMax}
                  onChange={(e) => setLotFilters((f) => ({ ...f, grossMax: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Kalan min (kg)</label>
                <input
                  type="number"
                  placeholder="0"
                  min="0"
                  step="0.01"
                  value={lotFilters.remainingMin}
                  onChange={(e) => setLotFilters((f) => ({ ...f, remainingMin: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Kalan max (kg)</label>
                <input
                  type="number"
                  placeholder="∞"
                  min="0"
                  step="0.01"
                  value={lotFilters.remainingMax}
                  onChange={(e) => setLotFilters((f) => ({ ...f, remainingMax: e.target.value }))}
                  className={inputCls}
                />
              </div>
            </div>

            {/* Row 3: date range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Giriş Tarihi (başlangıç)</label>
                <input
                  type="date"
                  value={lotFilters.dateFrom}
                  onChange={(e) => setLotFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Giriş Tarihi (bitiş)</label>
                <input
                  type="date"
                  value={lotFilters.dateTo}
                  onChange={(e) => setLotFilters((f) => ({ ...f, dateTo: e.target.value }))}
                  className={inputCls}
                />
              </div>
            </div>
          </div>}

          {/* ======================================
              TOTALS BAR
          ====================================== */}
          <div className="flex flex-wrap gap-3 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full text-sm text-gray-700 font-medium">
              Toplam Lot: <strong>{lotTotals.count}</strong>
              {lotTotals.count !== lots.length && (
                <span className="text-gray-400 font-normal">/ {lots.length}</span>
              )}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-full text-sm text-blue-700 font-medium">
              Toplam Brüt: <strong>{lotTotals.totalGross.toFixed(2)} kg</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 rounded-full text-sm text-green-700 font-medium">
              Toplam Kalan: <strong>{lotTotals.totalRemaining.toFixed(2)} kg</strong>
            </span>
          </div>

          {/* ======================================
              LOTS TABLE
          ====================================== */}
          {lots.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz lot yok</h3>
              <p className="text-gray-600">Yukarıdaki butonu kullanarak yeni lot ekleyin</p>
            </div>
          ) : sortedLots.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">Filtreye uyan lot bulunamadı</h3>
              <p className="text-gray-500 mb-4">Filtre kriterlerini değiştirin veya temizleyin.</p>
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                <X className="w-4 h-4" />
                Filtreleri Temizle
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {/* Sortable: Sertifika No */}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('certificate_number')}
                        className="flex items-center hover:text-gray-700 transition-colors"
                      >
                        Sertifika No
                        <SortIcon col="certificate_number" sortKey={sortKey} sortDir={sortDir} />
                      </button>
                    </th>
                    {/* Sortable: Ürün */}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('product')}
                        className="flex items-center hover:text-gray-700 transition-colors"
                      >
                        Ürün
                        <SortIcon col="product" sortKey={sortKey} sortDir={sortDir} />
                      </button>
                    </th>
                    {/* Sortable: Tedarikçi */}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('supplier')}
                        className="flex items-center hover:text-gray-700 transition-colors"
                      >
                        Tedarikçi
                        <SortIcon col="supplier" sortKey={sortKey} sortDir={sortDir} />
                      </button>
                    </th>
                    {/* Sortable: Brüt Ağırlık */}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('gross_weight_kg')}
                        className="flex items-center hover:text-gray-700 transition-colors"
                      >
                        Brüt Ağırlık
                        <SortIcon col="gross_weight_kg" sortKey={sortKey} sortDir={sortDir} />
                      </button>
                    </th>
                    {/* Sortable: Kalan */}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('remaining_kg')}
                        className="flex items-center hover:text-gray-700 transition-colors"
                      >
                        Kalan
                        <SortIcon col="remaining_kg" sortKey={sortKey} sortDir={sortDir} />
                      </button>
                    </th>
                    {/* Sortable: Giriş Tarihi */}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('received_date')}
                        className="flex items-center hover:text-gray-700 transition-colors"
                      >
                        Giriş Tarihi
                        <SortIcon col="received_date" sortKey={sortKey} sortDir={sortDir} />
                      </button>
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
                  {sortedLots.map((lot) => (
                    <tr key={lot.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {lot.certificate_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {lot.stock_item?.alloy} - Ø{lot.stock_item?.diameter_mm}mm
                      </td>
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
                                title={f.original_name}
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
                    {/* SEARCH & FILTERS */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Arama</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Alasım, Sertifika No, İş Emri No, Kalıp No..."
                    value={movementFilters.search}
                    onChange={(e) => setMovementFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Başlangıç Tarihi</label>
                <input
                  type="date"
                  value={movementFilters.dateFrom}
                  onChange={(e) => setMovementFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Bitiş Tarihi</label>
                <input
                  type="date"
                  value={movementFilters.dateTo}
                  onChange={(e) => setMovementFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            {(movementFilters.search || movementFilters.dateFrom || movementFilters.dateTo) && (
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => setMovementFilters(DEFAULT_MOVEMENT_FILTERS)}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Filtreleri Temizle
                </button>
              </div>
            )}
          </div>

          {movementsInitialLoading ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              <p className="text-gray-600 mt-4">Hareketler yükleniyor...</p>
            </div>
          ) : movements.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz hareket yok</h3>
              {/* <p className="text-gray-600">İş emirleri tamamlandığında stok hareketleri burada görünecektir</p> */}
              <p className="text-gray-600">
                {movementFilters.search || movementFilters.dateFrom || movementFilters.dateTo
                  ? 'Arama kriterlerine uygun hareket bulunamadı'
                  : 'İş emirleri tamamlandığında stok hareketleri burada görünecektir'}
              </p>
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
                      İş Emri No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kalıp / Bileşen
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
                  {movements.map((movement) => {
                    const wo = movement.work_order;
                    const lot = movement.lot;
                    const stockItem = lot?.stock_item;
                    const alloyDiam = stockItem
                      ? `${stockItem.alloy} Ø${stockItem.diameter_mm}mm`
                      : '-';
                    const supplierName =
                      lot?.supplier_ref?.name ?? lot?.supplier ?? '-';
                    const dieNumber = wo?.production_order?.die?.die_number;
                    const componentName = wo?.die_component?.component_type?.name;
                    const dieComponent = [dieNumber, componentName]
                      .filter(Boolean)
                      .join(' / ') || '-';

                    return (
                      <tr key={movement.id} className="hover:bg-gray-50">
                        {/* Tarih */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(movement.movement_date).toLocaleString('tr-TR')}
                        </td>

                        {/* İş Emri No */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {wo?.order_number ?? '-'}
                        </td>

                        {/* Kalıp / Bileşen */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {dieComponent}
                        </td>

                        {/* Lot: alloy+diameter + supplier */}
                        <td className="px-6 py-4 text-sm">
                          <span className="font-medium text-gray-900">{alloyDiam}</span>
                          <br />
                          <span className="text-gray-500 text-xs">{supplierName}</span>
                        </td>

                        {/* Miktar */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                          -{Number(movement.quantity_kg).toFixed(2)} kg
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              {/* Infinite Scroll Sentinel */}
              <div ref={movementsSentinelRef} className="py-6 border-t border-gray-100 text-center">
                {movementsLoadingMore ? (
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                ) : movements.length < movementsTotal ? (
                  <p className="text-sm text-gray-500">Daha fazla yükleniyor...</p>
                ) : (
                  <p className="text-sm text-gray-400">Tüm hareketler yüklendi ({movementsTotal})</p>
                )}
              </div>
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
