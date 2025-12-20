import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, Check, X, Filter } from "lucide-react";
import {
  getOperationTypes,
  createOperationType,
  updateOperationType,
  deleteOperationType,
} from "../services/operationTypeService";
import type { OperationType } from "../types/database";

export function OperationTypesPage() {
  const [items, setItems] = useState<OperationType[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // admin sayfasında aktif/pasif filtre
  const [onlyActive, setOnlyActive] = useState(false);

  const [formData, setFormData] = useState<{
    code: string;
    name: string;
    description: string;
    is_active: boolean;
  }>({
    code: "",
    name: "",
    description: "",
    is_active: true,
  });

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlyActive]);

  const load = async () => {
    try {
      setLoading(true);
      const data = await getOperationTypes({ only_active: onlyActive });
      setItems(data);
    } catch (err) {
      console.error("Operasyon tipleri yüklenemedi:", err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ code: "", name: "", description: "", is_active: true });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId != null) {
        await updateOperationType(editingId, {
          name: formData.name,
          description: formData.description || undefined,
          is_active: formData.is_active,
          // code'ı editte kilitli tutacağız
        });
      } else {
        await createOperationType({
          code: formData.code.trim().toUpperCase(),
          name: formData.name.trim(),
          description: formData.description?.trim() || undefined,
          is_active: formData.is_active,
        });
      }
      resetForm();
      await load();
    } catch (error: any) {
      console.error("İşlem başarısız:", error);
      alert(error?.message || "Bir hata oluştu");
    }
  };

  const handleEdit = (ot: OperationType) => {
    setEditingId(ot.id);
    setFormData({
      code: ot.code,
      name: ot.name,
      description: ot.description ?? "",
      is_active: ot.is_active,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bu operasyon tipini silmek istediğinizden emin misiniz?")) return;
    try {
      await deleteOperationType(id);
      await load();
    } catch (error: any) {
      console.error("Silme başarısız:", error);
      alert(error?.message || "Silme işlemi başarısız oldu");
    }
  };

  const toggleActive = async (ot: OperationType) => {
    try {
      await updateOperationType(ot.id, { is_active: !ot.is_active });
      await load();
    } catch (error: any) {
      console.error("Durum değiştirilemedi:", error);
      alert(error?.message || "Durum değiştirme başarısız oldu");
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-4">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Operasyon Tipleri</h1>
          <p className="text-gray-600 mt-1">Operasyon kategorilerini tanımlayın ve yönetin</p>
        </div>

        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Yeni Operasyon Tipi
        </button>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Filter className="w-4 h-4" />
          <span>Filtre:</span>
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={onlyActive}
            onChange={(e) => setOnlyActive(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          Sadece aktifleri göster
        </label>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingId != null ? "Operasyon Tipi Düzenle" : "Yeni Operasyon Tipi"}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kod *</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                placeholder="TORNA"
                required
                disabled={editingId != null}
              />
              <p className="text-xs text-gray-500 mt-1">Örn: TORNA, FREZE, TASLAMA</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ad *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Tornalama"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
                placeholder="Bu operasyon tipi hangi iş için kullanılır?"
              />
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Aktif</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {editingId != null ? "Güncelle" : "Oluştur"}
            </button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz operasyon tipi yok</h3>
          <p className="text-gray-600">Yukarıdaki butonu kullanarak yeni tip ekleyin</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kod</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ad</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Açıklama</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((ot) => (
                <tr key={ot.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{ot.code}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ot.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{ot.description || "-"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => toggleActive(ot)}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium cursor-pointer ${
                        ot.is_active ? "bg-green-100 text-green-800 hover:bg-green-200" : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                      }`}
                    >
                      {ot.is_active ? (
                        <>
                          <Check className="w-3 h-3" /> Aktif
                        </>
                      ) : (
                        <>
                          <X className="w-3 h-3" /> Pasif
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => handleEdit(ot)} className="text-blue-600 hover:text-blue-900 mr-4">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(ot.id)} className="text-red-600 hover:text-red-900">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
