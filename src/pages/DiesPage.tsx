import { useState, useEffect } from 'react';
import { Plus, Package, Eye, Search, Filter, Box } from 'lucide-react';
import { DieForm } from '../components/DieForm';
import {
  getDies,
  createDie,
  // addComponentToDie,
  createProductionOrder,
} from '../services/dieService';
import type { Die } from '../types/database';
import { mediaUrl } from "../lib/media";
import { DateDisplay } from '../components/common/DateDisplay';
import { DieDetail } from '../components/DieDetail';

const VIEWER_BASE = import.meta.env.VITE_DXF_VIEWER_BASE_URL ?? "/dxf-viewer";//"http://arslan:8082";

const dxfViewerUrl = (fileUrl: string) => {
  return `${VIEWER_BASE}/?file=${encodeURIComponent(fileUrl)}`;
};

export function DiesPage() {
  const [dies, setDies] = useState<Die[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedDie, setSelectedDie] = useState<Die | null>(null);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<Die['status'] | 'All'>('All');

  useEffect(() => {
    loadDies();
  }, []);

  const loadDies = async () => {
    try {
      setLoading(true);
      const data = await getDies();
      setDies(data);
    } catch (error) {
      console.error('Kalıplar yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

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
        
        isRevisioned: Boolean(formData.isRevisioned),

        // ✅ NEW: components artık createDie’ye gidiyor
        components: formData.components ?? [],
      });

      alert("Kalıp ve bileşenler başarıyla oluşturuldu.");
      setShowForm(false);
      loadDies();
    } catch (error) {
      console.error("Kalıp oluşturulamadı:", error);
      alert("Kalıp oluşturulamadı. (Bileşenler dahil atomik işlem)");
    }
  };

  const handleCreateProductionOrder = async (dieId: number) => {
    if (!confirm('Bu kalıp için üretim emri oluşturulsun mu?')) return;

    try {
      await createProductionOrder(dieId); // dieId zaten number
      loadDies();
      alert('Üretim emri başarıyla oluşturuldu.');
    } catch (error) {
      console.error('Üretim emri oluşturulamadı:', error);
      alert('Üretim emri oluşturulurken bir hata oluştu.');
    }
  };

  // const getStatusColor = (status: Die['status']) => {
  //   const colors: Record<Die['status'], string> = {
  //     Draft: 'bg-gray-100 text-gray-800',
  //     Waiting: 'bg-yellow-100 text-yellow-800',
  //     Ready: 'bg-blue-100 text-blue-800',
  //     'InProduction': 'bg-yellow-100 text-yellow-800',
  //     Completed: 'bg-green-100 text-green-800',
  //   };
  //   return colors[status] || colors.Draft;
  // };
  const getStatusColor = (status: Die['status']) => {
    const colors = {
      Draft: 'bg-gray-200 text-gray-800',
      Waiting: 'bg-yellow-200 text-yellow-800',
      Ready: 'bg-blue-200 text-blue-800',
      InProduction: 'bg-purple-200 text-purple-800',
      Completed: 'bg-green-200 text-green-800',
    };
    return colors[status] || colors.Draft;
  };

  const getStatusText = (status: Die['status']) => {
    const texts: Record<Die['status'], string> = {
      Draft: 'Taslak',
      Waiting: 'Üretim Emri Onayı Bekleniyor',
      Ready: 'Hazır',
      InProduction: 'Üretimde',
      Completed: 'Tamamlandı',
    };
    return texts[status] || status;
  };

  // Filter Logic
  const filteredDies = dies.filter(die => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      die.die_number.toLowerCase().includes(searchLower) ||
      die.customer_name?.toLowerCase().includes(searchLower) ||
      die.profile_no?.toLowerCase().includes(searchLower);

    const matchesStatus = statusFilter === 'All' || die.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <p className="text-gray-600 mt-4">Kalıplar yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Yeni Kalıp Oluştur
        </h1>
        <DieForm
          onSubmit={handleCreateDie}
          onCancel={() => setShowForm(false)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Kalıplar</h1>
          <p className="text-gray-600 mt-1">
            Sistemdeki kalıpları görüntüleyin ve yönetin
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Yeni Kalıp
        </button>
      </div> */}
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Kalıp Yönetimi</h1>
          <p className="text-gray-600 mt-1">
            Sistemdeki kalıpları görüntüleyin ve yönetin
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Yeni Kalıp
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Kalıp No, Müşteri, Profil No..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>

        <div className="relative min-w-[160px]">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm appearance-none bg-white"
          >
            <option value="All">Tüm Durumlar</option>
            <option value="Draft">Taslak</option>
            <option value="Waiting">Bekliyor</option>
            <option value="Ready">Hazır</option>
            <option value="InProduction">Üretimde</option>
            <option value="Completed">Tamamlandı</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
          {filteredDies.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {dies.length === 0 ? "Henüz kalıp yok." : "Kriterlere uygun kayıt bulunamadı."}
            </div>
          ) : (
            filteredDies.map((die) => (
              <div
                key={die.id}
                onClick={() => setSelectedDie(die)}
                className={`bg-white rounded-lg shadow-sm border-2 p-4 cursor-pointer transition-all ${selectedDie?.id === die.id
                    ? 'border-blue-500 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {die.die_number}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Ø{die.die_diameter_mm}mm • {getDieTypeDisplay(die)}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                      die.status
                    )}`}
                  >
                    {getStatusText(die.status)}
                  </span>
                </div>

                {/* Info Grid */}
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

                {/* Footer: Date & Summary */}
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
                      handleCreateProductionOrder(die.id);
                    }}
                    className="w-full mt-3 px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded transition-colors text-xs font-medium"
                  >
                    Üretim Emri Oluştur
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        <div className="lg:col-span-2">
          {selectedDie ? (
            <DieDetail
              dieId={selectedDie.id}
              onClose={() => setSelectedDie(null)}
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

function getDieTypeDisplay(die: Die) {
  if (die.die_type_ref?.name) return die.die_type_ref.name;
  return `Tip #${die.die_type_id}`;
}