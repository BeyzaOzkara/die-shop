import { useState, useEffect } from 'react';
import { Plus, Package, Eye } from 'lucide-react';
import { DieForm } from '../components/DieForm';
import {
  getDies,
  createDie,
  addComponentToDie,
  createProductionOrder,
} from '../services/dieService';
import type { Die } from '../types/database';
import { mediaUrl } from "../lib/media";

const VIEWER_BASE =
  import.meta.env.VITE_DXF_VIEWER_BASE_URL ?? "http://arslan:8082";

// const BASE =
//   import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

// const mediaUrl = (storagePath: string) => {
//   const normalized = storagePath.replace(/\\/g, "/");
//   return `${BASE}/media/${normalized}`;
// };

const dxfViewerUrl = (fileUrl: string) => {
  return `${VIEWER_BASE}/?file=${encodeURIComponent(fileUrl)}`;
};

export function DiesPage() {
  const [dies, setDies] = useState<Die[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

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
      const die = await createDie({
        dieNumber: formData.dieNumber,
        dieDiameterMm: Number(formData.dieDiameterMm),
        totalPackageLengthMm: Number(formData.totalPackageLengthMm),
        dieTypeId: Number(formData.dieTypeId),
        designFiles: formData.designFiles ?? [],

        profileNo: formData.profileNo,
        figureCount: formData.figureCount ?? null,
        customerName: formData.customerName,
        pressCode: formData.pressCode,
      });

      for (const component of formData.components) {
        await addComponentToDie(
          die.id,
          Number(component.componentTypeId),
          Number(component.stockItemId),
          Number(component.packageLengthMm),
          Number(component.diameterMm)
        );
      }

      setShowForm(false);
      loadDies();
    } catch (error) {
      console.error('Kalıp oluşturulamadı:', error);
      alert('Kalıp oluşturulurken bir hata oluştu.');
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

  const getStatusColor = (status: Die['status']) => {
    const colors: Record<Die['status'], string> = {
      Draft: 'bg-gray-100 text-gray-800',
      Waiting: 'bg-blue-100 text-yellow-800',
      Ready: 'bg-blue-100 text-blue-800',
      'InProduction': 'bg-yellow-100 text-yellow-800',
      Completed: 'bg-green-100 text-green-800',
    };
    return colors[status] || colors.Draft;
  };

  const getStatusText = (status: Die['status']) => {
    const texts: Record<Die['status'], string> = {
      Draft: 'Taslak',
      Waiting: 'Üretim Emri Onayı Bekleniyor',
      Ready: 'Hazır',
      'InProduction': 'Üretimde',
      Completed: 'Tamamlandı',
    };
    return texts[status] || status;
  };

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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Kalıplar</h1>
          <p className="text-gray-600 mt-1">
            Tüm kalıpları görüntüleyin ve yönetin
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Yeni Kalıp
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <p className="text-gray-600 mt-4">Yükleniyor...</p>
        </div>
      ) : dies.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Henüz kalıp yok
          </h3>
          <p className="text-gray-600 mb-6">
            Başlamak için ilk kalıbınızı oluşturun
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Yeni Kalıp Oluştur
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dies.map((die) => (
            <div
              key={die.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {die.die_number}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {/* {die.die_type_ref?.name ?? 'N/A'} */}
                    {die.customer_name ?? 'N/A'}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                    die.status
                  )}`}
                >
                  {getStatusText(die.status)}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Kalıp Ebatı:</span>
                  <span className="font-medium text-gray-900">
                    Ø{die.die_diameter_mm}x{die.total_package_length_mm} ({die.die_type_ref?.name ?? 'N/A'})
                  </span>
                </div>
                {die.profile_no ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Profil No:</span>
                    <span className="font-medium text-gray-900">{die.profile_no}</span>
                  </div>
                ) : null}
                {die.press_code ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Pres Kodu:</span>
                    <span className="font-medium text-gray-900">{die.press_code} (
                      {die.figure_count ? (
                          <span className="font-medium text-gray-900">{die.figure_count} Figür</span>
                      ) : null})
                    </span>
                  </div>
                ) : null}
                {die?.files?.length ? (
                  <div className="text-sm space-y-1">
                    {die.files.map((f) => {
                      const fileUrl = mediaUrl(f.storage_path);
                      const isDxf = (f.original_name ?? "").toLowerCase().endsWith(".dxf");

                      const href = isDxf ? dxfViewerUrl(fileUrl) : fileUrl;

                      return (
                        <a
                          key={f.id}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                          title={isDxf ? "DXF Viewer ile aç" : "Dosyayı indir/aç"}
                        >
                          <Eye className="w-4 h-4" />
                          {f.original_name}
                          {isDxf ? <span className="text-xs text-gray-500">(Viewer)</span> : null}
                        </a>
                      );
                    })}
                  </div>
                ): null}
                
              </div>

              {die.status === 'Draft' && (
                <button
                  onClick={() => handleCreateProductionOrder(die.id)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Üretim Emri Oluştur
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
