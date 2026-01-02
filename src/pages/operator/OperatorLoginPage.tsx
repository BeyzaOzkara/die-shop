import { useState } from 'react';
import { CreditCard, AlertCircle } from 'lucide-react';
import { loginOperatorByRFID } from '../../services/operatorService';
import type { Operator } from '../../types/database';

interface OperatorLoginPageProps {
  onLogin: (operator: Operator) => void;
}

export function OperatorLoginPage({ onLogin }: OperatorLoginPageProps) {
  const [rfidCode, setRfidCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const handleSubmit = async (e?: React.FormEvent, code?: string) => {
    if (e) e.preventDefault();

    const codeToSend = (code ?? rfidCode).trim();
    if (!codeToSend) return;

    setError('');
    setLoading(true);

    try {
      console.log('RFID kodu ile giriş deneniyor:', codeToSend);
      const operator = await loginOperatorByRFID(codeToSend);

      if (!operator) {
        setError('RFID kartı bulunamadı veya operatör aktif değil');
        setTimeout(() => setRfidCode(''), 500);
        return;
      }

      onLogin(operator);
    } catch (err: any) {
      console.error('Giriş hatası:', err);
      setError('Giriş yapılırken bir hata oluştu');
      setTimeout(() => setRfidCode(''), 500);
    } finally {
      setLoading(false);
    }
  };


  const handleChange = (rawValue: string) => {
    // Sadece rakam kalsın
    const clean = rawValue.replace(/\D/g, '');
    setRfidCode(clean);

    // RFID okuyucu 10 haneli sayı gönderiyorsa:
    if (clean.length === 10 && !loading) {
      // handleSubmit();
      handleSubmit(undefined, clean);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Operatör Girişi</h1>
          <p className="text-gray-600">RFID kartınızı okutun veya elle girin</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              RFID Kodu
            </label>
            <input
              type="text"
              value={rfidCode}
              onChange={(e) => handleChange(e.target.value)}
              className="w-full px-4 py-4 text-2xl text-center border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-blue-500 focus:border-blue-500 font-mono"
              placeholder="Kartı okutun..."
              autoFocus
              required
              disabled={loading}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !rfidCode}
            className="w-full py-4 bg-blue-600 text-white text-xl font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-lg"
          >
            {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Kalıp Atölyesi Yönetim Sistemi</p>
          <p className="mt-1">Operatör Paneli v1.0</p>
        </div>
      </div>
    </div>
  );
}
