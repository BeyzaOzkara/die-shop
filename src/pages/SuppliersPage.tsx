import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Pencil, ToggleLeft, ToggleRight, Truck, X } from 'lucide-react';
import {
    getSuppliers,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    type SupplierCreatePayload,
} from '../services/supplierService';
import type { Supplier } from '../types/database';

// ----------------------------------------
// Types
// ----------------------------------------
type ModalMode = 'create' | 'edit' | null;

interface FormState {
    name: string;
    tax_no: string;
    contact_name: string;
    phone: string;
    email: string;
    address: string;
    notes: string;
}

const EMPTY_FORM: FormState = {
    name: '',
    tax_no: '',
    contact_name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
};

function supplierToForm(s: Supplier): FormState {
    return {
        name: s.name,
        tax_no: s.tax_no ?? '',
        contact_name: s.contact_name ?? '',
        phone: s.phone ?? '',
        email: s.email ?? '',
        address: s.address ?? '',
        notes: s.notes ?? '',
    };
}

// ----------------------------------------
// Toast helper
// ----------------------------------------
interface Toast {
    id: number;
    message: string;
    type: 'success' | 'error';
}

let _toastId = 0;

// ----------------------------------------
// Main Component
// ----------------------------------------
export function SuppliersPage() {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

    const [modalMode, setModalMode] = useState<ModalMode>(null);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');

    const [toasts, setToasts] = useState<Toast[]>([]);

    // ---- Toasts ----
    const pushToast = (message: string, type: 'success' | 'error') => {
        const id = ++_toastId;
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
    };

    // ---- Load ----
    const loadSuppliers = useCallback(async () => {
        setLoading(true);
        try {
            const active =
                filterActive === 'active' ? true : filterActive === 'inactive' ? false : undefined;
            const data = await getSuppliers({ search: search || undefined, active });
            setSuppliers(data);
        } catch {
            pushToast('Tedarikçiler yüklenemedi.', 'error');
        } finally {
            setLoading(false);
        }
    }, [search, filterActive]);

    useEffect(() => {
        const t = setTimeout(loadSuppliers, 300);
        return () => clearTimeout(t);
    }, [loadSuppliers]);

    // ---- Modal helpers ----
    const openCreate = () => {
        setForm(EMPTY_FORM);
        setFormError('');
        setEditingSupplier(null);
        setModalMode('create');
    };

    const openEdit = (s: Supplier) => {
        setForm(supplierToForm(s));
        setFormError('');
        setEditingSupplier(s);
        setModalMode('edit');
    };

    const closeModal = () => {
        setModalMode(null);
        setEditingSupplier(null);
        setForm(EMPTY_FORM);
        setFormError('');
    };

    // ---- Submit ----
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) {
            setFormError('Tedarikçi adı zorunludur.');
            return;
        }
        setSubmitting(true);
        setFormError('');

        const payload: SupplierCreatePayload = {
            name: form.name.trim(),
            tax_no: form.tax_no.trim() || undefined,
            contact_name: form.contact_name.trim() || undefined,
            phone: form.phone.trim() || undefined,
            email: form.email.trim() || undefined,
            address: form.address.trim() || undefined,
            notes: form.notes.trim() || undefined,
        };

        try {
            if (modalMode === 'create') {
                await createSupplier(payload);
                pushToast('Tedarikçi başarıyla oluşturuldu.', 'success');
            } else if (editingSupplier) {
                await updateSupplier(editingSupplier.id, payload);
                pushToast('Tedarikçi güncellendi.', 'success');
            }
            closeModal();
            loadSuppliers();
        } catch (err: any) {
            const detail =
                err?.response?.data?.detail ??
                err?.message ??
                'Bir hata oluştu.';
            setFormError(detail);
        } finally {
            setSubmitting(false);
        }
    };

    // ---- Toggle active ----
    const handleToggleActive = async (s: Supplier) => {
        try {
            if (s.is_active) {
                // Soft-delete via DELETE (backend sets is_active=false)
                await deleteSupplier(s.id);
                pushToast(`"${s.name}" devre dışı bırakıldı.`, 'success');
            } else {
                // Reactivate via PUT
                await updateSupplier(s.id, { is_active: true });
                pushToast(`"${s.name}" aktif edildi.`, 'success');
            }
            loadSuppliers();
        } catch (err: any) {
            const detail = err?.response?.data?.detail ?? 'İşlem başarısız.';
            pushToast(detail, 'error');
        }
    };

    // ---- Render ----
    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Page Header */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                        <Truck className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Tedarikçi Yönetimi</h1>
                        <p className="text-sm text-gray-500">Tedarikçileri ekleyin, düzenleyin ve yönetin</p>
                    </div>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Yeni Tedarikçi
                </button>
            </div>

            {/* Filters */}
            <div className="mb-5 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Tedarikçi adı ara..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                    {(['all', 'active', 'inactive'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilterActive(f)}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filterActive === f
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            {f === 'all' ? 'Tümü' : f === 'active' ? 'Aktif' : 'İnaktif'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="text-center py-16">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                    <p className="text-gray-500 mt-3 text-sm">Yükleniyor...</p>
                </div>
            ) : suppliers.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
                    <Truck className="w-14 h-14 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">Tedarikçi bulunamadı</h3>
                    <p className="text-sm text-gray-500">
                        {search ? 'Arama kriterlerinizi değiştirin.' : '"Yeni Tedarikçi" butonuna tıklayarak ekleyin.'}
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">İsim</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Vergi No</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">İletişim Kişisi</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Telefon / E-posta</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Durum</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {suppliers.map((s) => (
                                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <span className="text-sm font-semibold text-gray-900">{s.name}</span>
                                        {s.address && (
                                            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[180px]">{s.address}</p>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{s.tax_no || <span className="text-gray-300">—</span>}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{s.contact_name || <span className="text-gray-300">—</span>}</td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-600">{s.phone || <span className="text-gray-300">—</span>}</div>
                                        {s.email && <div className="text-xs text-gray-400">{s.email}</div>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.is_active
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-gray-100 text-gray-500'
                                                }`}
                                        >
                                            {s.is_active ? 'Aktif' : 'İnaktif'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => openEdit(s)}
                                                title="Düzenle"
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                                Düzenle
                                            </button>
                                            <button
                                                onClick={() => handleToggleActive(s)}
                                                title={s.is_active ? 'Devre Dışı Bırak' : 'Aktif Et'}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${s.is_active
                                                        ? 'text-amber-600 border-amber-200 hover:bg-amber-50'
                                                        : 'text-green-600 border-green-200 hover:bg-green-50'
                                                    }`}
                                            >
                                                {s.is_active ? (
                                                    <><ToggleLeft className="w-3.5 h-3.5" />Devre Dışı</>
                                                ) : (
                                                    <><ToggleRight className="w-3.5 h-3.5" />Aktif Et</>
                                                )}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {modalMode && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <h2 className="text-lg font-bold text-gray-900">
                                {modalMode === 'create' ? 'Yeni Tedarikçi' : 'Tedarikçiyi Düzenle'}
                            </h2>
                            <button
                                onClick={closeModal}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {formError && (
                                <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">
                                    {formError}
                                </div>
                            )}

                            {/* Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tedarikçi Adı <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="ör. Çelik Metal A.Ş."
                                    required
                                />
                            </div>

                            {/* Two-col */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Vergi No</label>
                                    <input
                                        type="text"
                                        value={form.tax_no}
                                        onChange={(e) => setForm({ ...form, tax_no: e.target.value })}
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="ör. 1234567890"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">İletişim Kişisi</label>
                                    <input
                                        type="text"
                                        value={form.contact_name}
                                        onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="ör. Ahmet Yılmaz"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                                    <input
                                        type="tel"
                                        value={form.phone}
                                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="ör. +90 532 000 00 00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
                                    <input
                                        type="email"
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="ör. info@firma.com"
                                    />
                                </div>
                            </div>

                            {/* Address */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Adres</label>
                                <input
                                    type="text"
                                    value={form.address}
                                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="ör. Organize Sanayi Bölgesi, Bursa"
                                />
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
                                <textarea
                                    value={form.notes}
                                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                    rows={2}
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    placeholder="İsteğe bağlı notlar..."
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                >
                                    {submitting ? 'Kaydediliyor...' : modalMode === 'create' ? 'Oluştur' : 'Kaydet'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Toasts */}
            <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-[60]">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-fade-in ${t.type === 'success'
                                ? 'bg-green-600 text-white'
                                : 'bg-red-600 text-white'
                            }`}
                    >
                        {t.message}
                    </div>
                ))}
            </div>
        </div>
    );
}
