import React, { useEffect, useMemo, useState } from "react";
import { X, Upload, FileText, Trash2 } from "lucide-react";

type Props = {
  isOpen: boolean;
  dieId: number;
  dieNumber?: string;
  disabled?: boolean;
  onClose: () => void;
  onUploaded?: () => Promise<void> | void; // refresh callback
  uploadFn: (dieId: number, files: File[]) => Promise<void>;
};

export function UploadDieFilesModal({
  isOpen,
  dieId,
  dieNumber,
  disabled,
  onClose,
  onUploaded,
  uploadFn,
}: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setFiles([]);
      setBusy(false);
      setError(null);
    }
  }, [isOpen]);

  const totalSizeMb = useMemo(() => {
    const bytes = files.reduce((acc, f) => acc + f.size, 0);
    return (bytes / (1024 * 1024)).toFixed(2);
  }, [files]);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;
    setFiles((prev) => [...prev, ...picked]);
    e.target.value = "";
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpload = async () => {
    if (disabled) return;
    if (!files.length) {
      setError("Lütfen en az 1 dosya seçin.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await uploadFn(dieId, files);
      await onUploaded?.();
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "Dosya yüklenirken bir hata oluştu.");
    } finally {
      setBusy(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg rounded-xl shadow-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Kalıba Dosya Ekle</h3>
            <p className="text-sm text-gray-600 mt-1">
              Kalıp: <span className="font-medium">{dieNumber ?? `#${dieId}`}</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Yüklenen dosyalar kalıba eklenir ve aynı kalıbın diğer üretim emirlerinde de görünür.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition"
            aria-label="Kapat"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <label className="block">
            <div
              className={`flex items-center justify-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer
                ${disabled ? "bg-gray-50 border-gray-200 cursor-not-allowed" : "border-gray-300 hover:border-gray-400"}`}
            >
              <Upload className="w-5 h-5 text-gray-500" />
              <span className="text-sm text-gray-700">
                {disabled ? "Bu durumda dosya eklenemez" : "Dosya seçmek için tıkla (çoklu seçilebilir)"}
              </span>
            </div>
            <input
              type="file"
              multiple
              className="hidden"
              disabled={disabled || busy}
              onChange={onPick}
            />
          </label>

          {files.length > 0 && (
            <div className="border border-gray-200 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-900">
                  Seçilen Dosyalar ({files.length})
                </div>
                <div className="text-xs text-gray-500">{totalSizeMb} MB</div>
              </div>

              <div className="max-h-44 overflow-auto space-y-2">
                {files.map((f, idx) => (
                  <div
                    key={`${f.name}-${idx}`}
                    className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm text-gray-800 truncate" title={f.name}>
                          {f.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {(f.size / (1024 * 1024)).toFixed(2)} MB
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => removeFile(idx)}
                      className="p-2 rounded-lg hover:bg-gray-100 transition"
                      disabled={busy}
                      aria-label="Dosyayı kaldır"
                    >
                      <Trash2 className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
            disabled={busy}
          >
            Vazgeç
          </button>

          <button
            onClick={handleUpload}
            disabled={disabled || busy || files.length === 0}
            className={`px-4 py-2 rounded-lg font-medium transition
              ${disabled || busy || files.length === 0
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"}`}
          >
            {busy ? "Yükleniyor..." : "Yükle"}
          </button>
        </div>
      </div>
    </div>
  );
}
