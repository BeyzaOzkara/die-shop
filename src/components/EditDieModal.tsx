import { useState } from 'react';
import { X } from 'lucide-react';
import { DieForm } from './DieForm';
import type { Die } from '../types/database';

interface EditDieModalProps {
    die: Die;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function EditDieModal({ die, isOpen, onClose, onSuccess }: EditDieModalProps) {
    const [isDirty, setIsDirty] = useState(false);

    if (!isOpen) return null;

    const handleClose = () => {
        if (isDirty) {
            const confirmed = confirm(
                'Kaydedilmemiş değişiklikleriniz var. Çıkmak istediğinizden emin misiniz?'
            );
            if (!confirmed) return;
        }
        onClose();
    };

    const handleSubmit = async () => {
        // DieForm handles the actual API calls in edit mode
        // When it's successful, it will call this callback
        onSuccess();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-900">
                        Kalıp Düzenle: {die.die_number}
                    </h2>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label="Kapat"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <DieForm
                        mode="edit"
                        initialData={die}
                        onSubmit={handleSubmit}
                        onCancel={handleClose}
                    />
                </div>
            </div>
        </div>
    );
}
