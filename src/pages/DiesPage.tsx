import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Package, Search, Filter, Box, BarChart2, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { DieForm } from '../components/DieForm';
import {
  getDiesPaged,
  createDie,
  createProductionOrder,
  type DieFilters,
} from '../services/dieService';
import { getActiveDieTypes } from '../services/masterDataService';
import type { Die, DieType } from '../types/database';
import { DateDisplay } from '../components/common/DateDisplay';
import { DieDetail } from '../components/DieDetail';

const PAGE_SIZE = 30;

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Tüm Durumlar' },
  { value: 'Draft', label: 'Taslak' },
  { value: 'Waiting', label: 'Bekliyor' },
  { value: 'Ready', label: 'Hazır' },
  { value: 'InProduction', label: 'Üretimde' },
  { value: 'Completed', label: 'Tamamlandı' },
];

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-gray-200 text-gray-800',
  Waiting: 'bg-yellow-200 text-yellow-800',
  Ready: 'bg-blue-200 text-blue-800',
  InProduction: 'bg-purple-200 text-purple-800',
  Completed: 'bg-green-200 text-green-800',
};

const STATUS_LABELS: Record<string, string> = {
  Draft: 'Taslak',
  Waiting: 'Ü.E. Onayı Bekleniyor',
  Ready: 'Hazır',
  InProduction: 'Üretimde',
  Completed: 'Tamamlandı',
};

interface Props {
  onNavigateToDashboard: () => void;
}

const EMPTY_FILTERS: DieFilters = {
  search: '',
  status: '',
  dieTypeId: undefined,
  isRevisioned: undefined,
  dateFrom: '',
  dateTo: '',
  dieDiameterMmMin: undefined,
  dieDiameterMmMax: undefined,
  totalPackageLengthMmMin: undefined,
  totalPackageLengthMmMax: undefined,
  figureCount: undefined,
  pressCode: '',
};

function hasActiveAdvancedFilters(f: DieFilters): boolean {
  return !!(f.status || f.dieTypeId != null || f.isRevisioned != null || f.dateFrom || f.dateTo
    || f.dieDiameterMmMin != null || f.dieDiameterMmMax != null
    || f.totalPackageLengthMmMin != null || f.totalPackageLengthMmMax != null
    || f.figureCount != null || f.pressCode);
}

export function DiesPage({ onNavigateToDashboard }: Props) {
  // ── list state ──────────────────────────────────────────────────────────
  const [dies, setDies] = useState<Die[]>([]);
  const [total, setTotal] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [skip, setSkip] = useState(0);
  const hasMore = dies.length < total;

  // ── selected die ─────────────────────────────────────────────────────────
  const [selectedDie, setSelectedDie] = useState<Die | null>(null);

  // ── form (create / copy) ─────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [copyMode, setCopyMode] = useState(false);
  const [initialDataForCopy, setInitialDataForCopy] = useState<Die | null>(null);

  // ── search & filter ──────────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState('');       // raw input
  const [filters, setFilters] = useState<DieFilters>(EMPTY_FILTERS);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dieTypes, setDieTypes] = useState<DieType[]>([]);

  // debounce ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── infinite scroll sentinel ─────────────────────────────────────────────
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // ── stable filter ref (avoids stale closures in the observer) ───────────
  const filtersRef = useRef<DieFilters>(filters);
  const skipRef = useRef(0);
  filtersRef.current = filters;
  skipRef.current = skip;

  // ────────────────────────────────────────────────────────────────────────
  // Fetch die types for advanced search panel
  // ────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    getActiveDieTypes()
      .then(setDieTypes)
      .catch(() => {/* non-critical */});
  }, []);

  // ────────────────────────────────────────────────────────────────────────
  // Core fetch: first page or appended page
  // ────────────────────────────────────────────────────────────────────────
  const fetchPage = useCallback(async (currentSkip: number, currentFilters: DieFilters, replace: boolean) => {
    if (replace) {
      setInitialLoading(true);
    } else {
      setPageLoading(true);
    }

    try {
      const res = await getDiesPaged(currentSkip, PAGE_SIZE, currentFilters);
      setTotal(res.total);
      if (replace) {
        setDies(res.items);
      } else {
        setDies(prev => [...prev, ...res.items]);
      }
      setSkip(currentSkip + res.items.length);
    } catch (err) {
      console.error('Kalıplar yüklenemedi:', err);
    } finally {
      setInitialLoading(false);
      setPageLoading(false);
    }
  }, []);

  // ────────────────────────────────────────────────────────────────────────
  // Initial + filter-change load: always reset list
  // ────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    setSkip(0);
    setSelectedDie(null);
    fetchPage(0, filters, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // ────────────────────────────────────────────────────────────────────────
  // Debounced simple search → applies to filters.search
  // ────────────────────────────────────────────────────────────────────────
  const onSearchInputChange = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: value }));
    }, 400);
  };

  // ────────────────────────────────────────────────────────────────────────
  // Advanced filter changes (immediate)
  // ────────────────────────────────────────────────────────────────────────
  const setAdvancedFilter = <K extends keyof DieFilters>(key: K, value: DieFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setSearchInput('');
    setFilters(EMPTY_FILTERS);
  };

  // ────────────────────────────────────────────────────────────────────────
  // IntersectionObserver for scroll-to-load
  // ────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !pageLoading &&
          !initialLoading &&
          skipRef.current < total   // "has more" check using refs
        ) {
          fetchPage(skipRef.current, filtersRef.current, false);
        }
      },
      { threshold: 0.1 }
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageLoading, initialLoading, total]);

  // ────────────────────────────────────────────────────────────────────────
  // Create die handler
  // ────────────────────────────────────────────────────────────────────────
  const handleCreateDie = async (formData: any) => {
    try {
      await createDie({
        dieNumber: formData.dieNumber,
        dieDiameterMm: Number(formData.dieDiameterMm),
        totalPackageLengthMm: Number(formData.totalPackageLengthMm),
        dieTypeId: Number(formData.dieTypeId),
        designFiles: formData.designFiles ?? [],
        profileNo: formData.profileNo,
        figureCount: formData.figureCount ?? null,
        customerName: formData.customerName,
        pressCode: formData.pressCode,
        description: formData.description ?? null,
        expectedCompletionDate: formData.expectedCompletionDate ?? null,
        isRevisioned: Boolean(formData.isRevisioned),
        components: formData.components ?? [],
      });
      alert('Kalıp ve bileşenler başarıyla oluşturuldu.');
      setShowForm(false);
      // Reload first page to show the new die at top
      fetchPage(0, filters, true);
    } catch (error) {
      console.error('Kalıp oluşturulamadı:', error);
      alert('Kalıp oluşturulamadı. (Bileşenler dahil atomik işlem)');
    }
  };

  const handleCreateProductionOrder = async (dieId: number) => {
    if (!confirm('Bu kalıp için üretim emri oluşturulsun mu?')) return;
    try {
      await createProductionOrder(dieId);
      fetchPage(0, filters, true);
      alert('Üretim emri başarıyla oluşturuldu.');
    } catch (error) {
      console.error('Üretim emri oluşturulamadı:', error);
      alert('Üretim emri oluşturulurken bir hata oluştu.');
    }
  };

  const handleCopyDie = (die: Die) => {
    const copyData: Die = {
      ...die,
      die_number: `${die.die_number}-KOPYA`,
      is_revisioned: false,
      files: [],
      components: die.components?.map(comp => ({
        ...comp,
        id: undefined as any,
        die_id: undefined as any,
      })),
    };
    setInitialDataForCopy(copyData);
    setCopyMode(true);
    setShowForm(true);
    setSelectedDie(null);
  };

  // ────────────────────────────────────────────────────────────────────────
  // Render: Create / Copy form
  // ────────────────────────────────────────────────────────────────────────
  if (showForm) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          {copyMode ? 'Kalıp Kopyala' : 'Yeni Kalıp Oluştur'}
        </h1>
        <DieForm
          mode="create"
          initialData={copyMode && initialDataForCopy ? initialDataForCopy : undefined}
          onSubmit={handleCreateDie}
          onCancel={() => {
            setShowForm(false);
            setCopyMode(false);
            setInitialDataForCopy(null);
          }}
        />
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────
  // Render: Main page
  // ────────────────────────────────────────────────────────────────────────
  const advancedActive = hasActiveAdvancedFilters(filters);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Kalıp Yönetimi</h1>
          <p className="text-gray-600 mt-1">
            Sistemdeki kalıpları görüntüleyin ve yönetin
            {!initialLoading && (
              <span className="ml-2 text-sm font-medium text-gray-500">
                ({total} kayıt)
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Yeni Kalıp
          </button>
          <button
            onClick={onNavigateToDashboard}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BarChart2 className="w-4 h-4" />
            Genel Durum
          </button>
        </div>
      </div>

      {/* ── Search Bar + Advanced Toggle ───────────────────────────────── */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-2">
        <div className="flex flex-wrap gap-3 p-4">
          {/* Simple search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Kalıp No, Müşteri, Profil No..."
              value={searchInput}
              onChange={(e) => onSearchInputChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Advanced search toggle */}
          <button
            onClick={() => setShowAdvanced(v => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
              showAdvanced || advancedActive
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Gelişmiş Arama
            {advancedActive && (
              <span className="ml-1 w-2 h-2 rounded-full bg-blue-500 inline-block" title="Aktif filtre var" />
            )}
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* ── Advanced Filter Panel ──────────────────────────────────── */}
        {showAdvanced && (
          <div className="border-t border-gray-200 px-4 py-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">

              {/* Status */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Durum</label>
                <select
                  value={filters.status ?? ''}
                  onChange={(e) => setAdvancedFilter('status', e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  {STATUS_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Die Type */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Kalıp Tipi</label>
                <select
                  value={filters.dieTypeId ?? ''}
                  onChange={(e) => setAdvancedFilter('dieTypeId', e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">Tümü</option>
                  {dieTypes.map(dt => (
                    <option key={dt.id} value={dt.id}>{dt.name}</option>
                  ))}
                </select>
              </div>

              {/* Is Revisioned */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Revizyon</label>
                <select
                  value={filters.isRevisioned == null ? '' : String(filters.isRevisioned)}
                  onChange={(e) => {
                    const v = e.target.value;
                    setAdvancedFilter('isRevisioned', v === '' ? undefined : v === 'true');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">Tümü</option>
                  <option value="true">Revizyonlu</option>
                  <option value="false">Revizyonsuz</option>
                </select>
              </div>

              {/* Date from */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Eklenme (Başlangıç)</label>
                <input
                  type="date"
                  value={filters.dateFrom ?? ''}
                  onChange={(e) => setAdvancedFilter('dateFrom', e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Date to */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Eklenme (Bitiş)</label>
                <input
                  type="date"
                  value={filters.dateTo ?? ''}
                  onChange={(e) => setAdvancedFilter('dateTo', e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* === Row 2: Numeric & text filters === */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mt-4 pt-4 border-t border-gray-100">

              {/* Die Diameter min */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Çap (min mm)</label>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  placeholder="—"
                  value={filters.dieDiameterMmMin ?? ''}
                  onChange={(e) => setAdvancedFilter('dieDiameterMmMin', e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Die Diameter max */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Çap (max mm)</label>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  placeholder="—"
                  value={filters.dieDiameterMmMax ?? ''}
                  onChange={(e) => setAdvancedFilter('dieDiameterMmMax', e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Total Package min */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Paket (min mm)</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  placeholder="—"
                  value={filters.totalPackageLengthMmMin ?? ''}
                  onChange={(e) => setAdvancedFilter('totalPackageLengthMmMin', e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Total Package max */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Paket (max mm)</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  placeholder="—"
                  value={filters.totalPackageLengthMmMax ?? ''}
                  onChange={(e) => setAdvancedFilter('totalPackageLengthMmMax', e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Figure Count */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Figür Sayısı</label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  placeholder="—"
                  value={filters.figureCount ?? ''}
                  onChange={(e) => setAdvancedFilter('figureCount', e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Press Code */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Pres Kodu</label>
                <input
                  type="text"
                  placeholder="—"
                  value={filters.pressCode ?? ''}
                  onChange={(e) => setAdvancedFilter('pressCode', e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Reset */}
            {(advancedActive || searchInput) && (
              <div className="mt-3 flex justify-end">
                <button
                  onClick={resetFilters}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Filtreleri Temizle
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Content grid ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Die list (left panel) ───────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-4 max-h-[calc(100vh-290px)] overflow-y-auto pr-2">

          {initialLoading ? (
            /* First-load skeleton */
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg border-2 border-gray-200 p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-3/4 mb-3" />
                <div className="h-3 bg-gray-100 rounded w-1/3" />
              </div>
            ))
          ) : dies.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {total === 0 ? 'Kriterlere uygun kayıt bulunamadı.' : 'Henüz kalıp yok.'}
            </div>
          ) : (
            <>
              {dies.map((die) => (
                <DieCard
                  key={die.id}
                  die={die}
                  selected={selectedDie?.id === die.id}
                  onSelect={() => setSelectedDie(die)}
                  onCreateProductionOrder={handleCreateProductionOrder}
                />
              ))}

              {/* Scroll sentinel + state feedback */}
              <div ref={sentinelRef} className="py-2 text-center">
                {pageLoading && (
                  <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                )}
                {!pageLoading && !hasMore && dies.length > 0 && (
                  <p className="text-xs text-gray-400">Tüm kalıplar yüklendi ({total})</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Die detail (right panel) ────────────────────────────────── */}
        <div className="lg:col-span-2">
          {selectedDie ? (
            <DieDetail
              dieId={selectedDie.id}
              onClose={() => setSelectedDie(null)}
              onDeleted={() => {
                setSelectedDie(null);
                fetchPage(0, filters, true);
              }}
              onCopyRequested={handleCopyDie}
            />
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center h-full flex flex-col justify-center items-center">
              <Package className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-gray-500">
                Detayları görüntülemek için soldan bir kalıp seçin
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// DieCard — extracted for readability
// ──────────────────────────────────────────────────────────────────────────
interface DieCardProps {
  die: Die;
  selected: boolean;
  onSelect: () => void;
  onCreateProductionOrder: (id: number) => void;
}

function DieCard({ die, selected, onSelect, onCreateProductionOrder }: DieCardProps) {
  return (
    <div
      onClick={onSelect}
      className={`bg-white rounded-lg shadow-sm border-2 p-4 cursor-pointer transition-all ${
        selected ? 'border-blue-500 shadow-md' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">{die.die_number}</h3>
            {die.is_revisioned && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-800 border border-orange-200">
                REV
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600">
            Ø{die.die_diameter_mm}mm • {getDieTypeDisplay(die)}
          </p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[die.status] ?? STATUS_COLORS.Draft}`}>
          {STATUS_LABELS[die.status] ?? die.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
        <div>
          <span className="block text-gray-400">Profil No</span>
          {die.profile_no || '-'}
        </div>
        <div>
          <span className="block text-gray-400">Müşteri</span>
          {die.customer_name || '-'}
        </div>
      </div>

      <div className="flex justify-between items-end mt-3 pt-2 border-t border-gray-100">
        <div className="text-xs text-gray-400 flex flex-col">
          <span>Eklenme:</span>
          <DateDisplay date={die.created_at} showTime={false} />
        </div>
        <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
          <Box className="w-3 h-3" />
          <span>Detayları Gör</span>
        </div>
      </div>

      {die.status === 'Draft' && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCreateProductionOrder(die.id);
          }}
          className="w-full mt-3 px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded transition-colors text-xs font-medium"
        >
          Üretim Emri Oluştur
        </button>
      )}
    </div>
  );
}

function getDieTypeDisplay(die: Die) {
  if (die.die_type_ref?.name) return die.die_type_ref.name;
  return `Tip #${die.die_type_id}`;
}