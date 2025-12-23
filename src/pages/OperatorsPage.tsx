// src/pages/OperatorsPage.tsx
import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Check, X, UserCircle } from 'lucide-react';
import {
  getOperators,
  createOperator,
  updateOperator,
  deleteOperator,
} from '../services/operatorService';
import { getWorkCenters } from '../services/workCenterService';
import type { Operator, WorkCenter } from '../types/database';

type OperatorForm = {
  rfid_code: string;
  name: string;
  employee_number: string;
  work_center_ids: string[]; // 👈 çoklu seçim
  is_active: boolean;
};

export function OperatorsPage() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState<OperatorForm>({
    rfid_code: '',
    name: '',
    employee_number: '',
    work_center_ids: [],
    is_active: true,
  });

  const [expandedWorkCenters, setExpandedWorkCenters] = useState<Set<number>>(new Set());

  const toggleExpanded = (operatorId: number) => {
    setExpandedWorkCenters((prev) => {
      const next = new Set(prev);
      if (next.has(operatorId)) next.delete(operatorId);
      else next.add(operatorId);
      return next;
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [operatorsData, centersData] = await Promise.all([
        getOperators(),
        getWorkCenters(),
      ]);
      setOperators(operatorsData);
      setWorkCenters(centersData);
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      rfid_code: formData.rfid_code,
      name: formData.name,
      employee_number: formData.employee_number || undefined,
      work_center_ids: formData.work_center_ids.map((id) => Number(id)),
      is_active: formData.is_active,
    };

    try {
      if (editingId !== null) {
        await updateOperator(editingId, payload);
      } else {
        await createOperator(payload);
      }
      resetForm();
      loadData();
    } catch (error: any) {
      console.error('İşlem başarısız:', error);
      alert(error.message || 'Bir hata oluştu');
    }
  };

  const handleEdit = (operator: Operator) => {
    setEditingId(operator.id);
    setFormData({
      rfid_code: operator.rfid_code,
      name: operator.name,
      employee_number: operator.employee_number || '',
      work_center_ids:
        operator.work_centers?.map((wc) => String(wc.id)) ?? [],
      is_active: operator.is_active,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bu operatörü silmek istediğinizden emin misiniz?')) return;

    try {
      await deleteOperator(id);
      loadData();
    } catch (error: any) {
      console.error('Silme başarısız:', error);
      alert(error.message || 'Silme işlemi başarısız oldu');
    }
  };

  const toggleActive = async (operator: Operator) => {
    try {
      await updateOperator(operator.id, { is_active: !operator.is_active });
    } catch (error) {
      console.error('Durum değiştirilemedi:', error);
      alert('Durum değiştirme başarısız oldu');
    } finally {
      loadData();
    }
  };

  const resetForm = () => {
    setFormData({
      rfid_code: '',
      name: '',
      employee_number: '',
      work_center_ids: [],
      is_active: true,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleWorkCenterChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const selected = Array.from(e.target.selectedOptions).map(
      (opt) => opt.value
    );
    setFormData((prev) => ({ ...prev, work_center_ids: selected }));
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Operatör Yönetimi</h1>
          <p className="text-gray-600 mt-1">
            Atölye operatörlerini tanımlayın ve yönetin
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Yeni Operatör
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingId !== null ? 'Operatör Düzenle' : 'Yeni Operatör'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                RFID Kodu *
              </label>
              <input
                type="text"
                value={formData.rfid_code}
                onChange={(e) =>
                  setFormData({ ...formData, rfid_code: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={editingId !== null}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ad Soyad *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sicil No
              </label>
              <input
                type="text"
                value={formData.employee_number}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    employee_number: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Çalışma Merkezleri *
              </label>
              <select
                multiple
                value={formData.work_center_ids}
                onChange={handleWorkCenterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-32"
                required
              >
                {workCenters.map((wc) => (
                  <option key={wc.id} value={String(wc.id)}>
                    {wc.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                CTRL (veya Mac’te ⌘) + tıklayarak birden fazla merkez
                seçebilirsiniz.
              </p>
            </div>

            <div>
              <label className="flex items-center gap-2 mt-6 md:mt-8">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Aktif
                </span>
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
              {editingId !== null ? 'Güncelle' : 'Oluştur'}
            </button>
          </div>
        </form>
      )}

      {operators.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <UserCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Henüz operatör yok
          </h3>
          <p className="text-gray-600">
            Yukarıdaki butonu kullanarak yeni operatör ekleyin
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full table-fixed">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  RFID Kodu
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ad Soyad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sicil No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Çalışma Merkezleri
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Durum
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {operators.map((operator) => (
                <tr key={operator.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {operator.rfid_code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {operator.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {operator.employee_number || '-'}
                  </td>
                  {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {operator.work_centers && operator.work_centers.length > 0
                      ? operator.work_centers.map((wc) => wc.name).join(', ')
                      : '-'}
                  </td> */}
                  <td className="px-6 py-4 text-sm text-gray-600 align-top">
                    {operator.work_centers && operator.work_centers.length > 0 ? (
                      (() => {
                        const wcs = operator.work_centers.map((wc) => wc.name);
                        const isExpanded = expandedWorkCenters.has(operator.id);

                        const visibleCount = 3;
                        const visible = isExpanded ? wcs : wcs.slice(0, visibleCount);
                        const remaining = wcs.length - visible.length;

                        return (
                          <div className="max-w-[520px] break-words">
                            <div className="flex flex-wrap gap-1">
                              {visible.map((name) => (
                                <span
                                  key={name}
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700"
                                  title={name}
                                >
                                  {name}
                                </span>
                              ))}

                              {!isExpanded && remaining > 0 && (
                                <button
                                  type="button"
                                  onClick={() => toggleExpanded(operator.id)}
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700 hover:bg-blue-100"
                                >
                                  +{remaining} daha
                                </button>
                              )}

                              {isExpanded && wcs.length > visibleCount && (
                                <button
                                  type="button"
                                  onClick={() => toggleExpanded(operator.id)}
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-50 text-gray-700 hover:bg-gray-100"
                                >
                                  Kapat
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      '-'
                    )}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => toggleActive(operator)}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium cursor-pointer ${
                        operator.is_active
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }`}
                    >
                      {operator.is_active ? (
                        <>
                          <Check className="w-3 h-3" />
                          Aktif
                        </>
                      ) : (
                        <>
                          <X className="w-3 h-3" />
                          Pasif
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(operator)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(operator.id)}
                      className="text-red-600 hover:text-red-900"
                    >
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
