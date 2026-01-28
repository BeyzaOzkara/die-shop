import { useState, useEffect } from "react";
import { X, CheckSquare, Square, Package, AlertCircle } from "lucide-react";
import { previewWorkOrders } from "../services/orderService";
import type { WorkOrderPreviewResponse, ComponentPreview } from "../types/database";

interface OperationPlanningModalProps {
    productionOrderId: number;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (selectedOperations: Record<number, number[]>) => void;
    loading?: boolean;
}

export function OperationPlanningModal({
    productionOrderId,
    isOpen,
    onClose,
    onConfirm,
    loading: submitting = false,
}: OperationPlanningModalProps) {
    const [data, setData] = useState<WorkOrderPreviewResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Selected operations state: component_id -> list of bom_ids
    const [selectedOps, setSelectedOps] = useState<Record<number, number[]>>({});

    useEffect(() => {
        if (isOpen && productionOrderId) {
            loadPreview();
        }
    }, [isOpen, productionOrderId]);

    const loadPreview = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await previewWorkOrders(productionOrderId);
            setData(response);

            // Initialize all selected by default
            const initialSelection: Record<number, number[]> = {};
            response.components.forEach(comp => {
                initialSelection[comp.component_id] = comp.bom_operations.map(op => op.bom_id);
            });
            setSelectedOps(initialSelection);
        } catch (err: any) {
            console.error("Preview error:", err);
            setError("Planlama verileri yüklenirken bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    const toggleOperation = (componentId: number, bomId: number) => {
        setSelectedOps(prev => {
            const current = prev[componentId] || [];
            const exists = current.includes(bomId);

            let updated;
            if (exists) {
                updated = current.filter(id => id !== bomId);
            } else {
                updated = [...current, bomId];
            }

            return { ...prev, [componentId]: updated };
        });
    };

    const toggleComponent = (componentId: number, allBomIds: number[]) => {
        setSelectedOps(prev => {
            const current = prev[componentId] || [];
            // If all selected, deselect all. Otherwise, select all.
            const allSelected = allBomIds.every(id => current.includes(id));

            return {
                ...prev,
                [componentId]: allSelected ? [] : [...allBomIds]
            };
        });
    };

    const handleConfirm = () => {
        onConfirm(selectedOps);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Üretim Planlama</h2>
                        <p className="text-sm text-gray-600 mt-1">
                            İş emirlerine dahil edilecek operasyonları seçin
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                            <p className="text-gray-600 mt-4">Planlama verileri alınıyor...</p>
                        </div>
                    ) : error ? (
                        <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-lg">
                            <AlertCircle className="w-6 h-6 flex-shrink-0" />
                            <p>{error}</p>
                        </div>
                    ) : data ? (
                        <div className="space-y-8">
                            {data.components.map((comp) => (
                                <div key={comp.component_id} className="border border-gray-200 rounded-lg overflow-hidden">
                                    {/* Component Header */}
                                    <div className="bg-gray-50 p-4 border-b border-gray-200 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white rounded-lg border border-gray-200">
                                                <Package className="w-5 h-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900">
                                                    {comp.component_type.name}
                                                </h3>
                                                <p className="text-sm text-gray-500 font-mono">
                                                    {comp.component_type.code}
                                                </p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => toggleComponent(comp.component_id, comp.bom_operations.map(op => op.bom_id))}
                                            className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                                        >
                                            {comp.bom_operations.every(op => (selectedOps[comp.component_id] || []).includes(op.bom_id))
                                                ? "Tümünü Kaldır"
                                                : "Tümünü Seç"}
                                        </button>
                                    </div>

                                    {/* Operations List */}
                                    <div className="divide-y divide-gray-100">
                                        {comp.bom_operations.map((op) => {
                                            const isSelected = (selectedOps[comp.component_id] || []).includes(op.bom_id);

                                            return (
                                                <div
                                                    key={op.bom_id}
                                                    onClick={() => toggleOperation(comp.component_id, op.bom_id)}
                                                    className={`p-4 flex items-start gap-4 cursor-pointer transition-colors ${isSelected ? "bg-blue-50/30" : "hover:bg-gray-50"
                                                        }`}
                                                >
                                                    <div className={`mt-1 text-blue-600`}>
                                                        {isSelected ? (
                                                            <CheckSquare className="w-5 h-5" />
                                                        ) : (
                                                            <Square className="w-5 h-5 text-gray-400" />
                                                        )}
                                                    </div>

                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-mono text-xs font-semibold bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                                                                #{op.sequence_number}
                                                            </span>
                                                            <h4 className={`font-medium ${isSelected ? "text-gray-900" : "text-gray-500"}`}>
                                                                {op.operation_name}
                                                            </h4>
                                                        </div>

                                                        <div className="flex items-center gap-4 text-sm text-gray-500">
                                                            <span>
                                                                {op.operation_type.name}
                                                            </span>
                                                            {op.estimated_duration_minutes && (
                                                                <span className="flex items-center gap-1">
                                                                    • {op.estimated_duration_minutes} dk
                                                                </span>
                                                            )}
                                                        </div>

                                                        {op.notes && (
                                                            <p className="mt-2 text-sm text-gray-500 italic bg-amber-50 px-3 py-1.5 rounded-lg inline-block border border-amber-100">
                                                                Not: {op.notes}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : null}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-200 rounded-lg transition-colors"
                        disabled={submitting}
                    >
                        İptal
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={submitting || loading || !data}
                        className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                        {submitting ? "Oluşturuluyor..." : "Onayla ve Başlat"}
                    </button>
                </div>
            </div>
        </div>
    );
}
