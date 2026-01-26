import { useState, useEffect } from 'react';
import { Package, FileText, Settings, Calendar } from 'lucide-react';
import type { Die } from '../types/database';
import { getDieById } from '../services/dieService';
import { DateDisplay } from './common/DateDisplay';
import { mediaUrl } from "../lib/media";

interface DieDetailProps {
    dieId: number;
    onClose: () => void;
}

const VIEWER_BASE = import.meta.env.VITE_DXF_VIEWER_BASE_URL ?? "/dxf-viewer";
const dxfViewerUrl = (fileUrl: string) => `${VIEWER_BASE}/?file=${encodeURIComponent(fileUrl)}`;

export function DieDetail({ dieId, onClose }: DieDetailProps) {
    const [die, setDie] = useState<Die | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDie();
    }, [dieId]);

    const loadDie = async () => {
        try {
            setLoading(true);
            const data = await getDieById(dieId);
            setDie(data);
        } catch (error) {
            console.error('Kalıp detayları yüklenemedi:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Yükleniyor...</div>;
    if (!die) return <div className="p-8 text-center">Kalıp bulunamadı.</div>;

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">{die.die_number}</h2>
                    <p className="text-gray-500 mt-1">
                        {die.customer_name} • {die.profile_no}
                    </p>
                </div>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600"
                >
                    ✕
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">

                {/* Key Info */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-500 mb-1">Kalıp Tipi</div>
                        <div className="font-medium">{die.die_type_ref?.name}</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-500 mb-1">Ebatlar</div>
                        <div className="font-medium">Ø{die.die_diameter_mm} x {die.total_package_length_mm}</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-500 mb-1">Figür Sayısı</div>
                        <div className="font-medium">{die.figure_count ?? '-'}</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-500 mb-1">Pres Kodu</div>
                        <div className="font-medium">{die.press_code ?? '-'}</div>
                    </div>
                </div>

                {/* Timestamps */}
                <div className="border-t border-gray-100 pt-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-500" />
                        Tarihçesi
                    </h3>
                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                        <div className="text-gray-500">Oluşturulma:</div>
                        <div className="text-right"><DateDisplay date={die.created_at} /></div>
                    </div>
                </div>

                {/* Components */}
                <div className="border-t border-gray-100 pt-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                        <Settings className="w-4 h-4 text-purple-500" />
                        Bileşenler ({die.components?.length ?? 0})
                    </h3>
                    <div className="space-y-2">
                        {die.components?.map((comp) => (
                            <div key={comp.id} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                                <span className="font-medium text-gray-700">
                                    {comp.component_type?.name ?? `Tip ${comp.component_type_id}`}
                                </span>
                                {comp.stock_item?.alloy} (Ø{comp.stock_item?.diameter_mm})
                            </div>
                        ))}
                    </div>
                </div>

                {/* Files */}
                {die.files && die.files.length > 0 && (
                    <div className="border-t border-gray-100 pt-4">
                        <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-orange-500" />
                            Dosyalar
                        </h3>
                        <div className="space-y-2">
                            {die.files.map((f) => {
                                const fileUrl = mediaUrl(f.storage_path);
                                const absoluteFileUrl = new URL(fileUrl, window.location.origin).toString();
                                const isDxf = (f.original_name ?? "").toLowerCase().endsWith(".dxf");
                                const href = isDxf ? dxfViewerUrl(absoluteFileUrl) : absoluteFileUrl;

                                return (
                                    <a
                                        key={f.id}
                                        href={href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded group transition-colors"
                                    >
                                        <div className="p-2 bg-white border border-gray-200 rounded group-hover:border-blue-300">
                                            <FileText className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                                        </div>
                                        <span className="text-sm text-gray-600 group-hover:text-blue-600 underline decoration-transparent group-hover:decoration-blue-600 transition-all">
                                            {f.original_name}
                                        </span>
                                    </a>
                                );
                            })}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
