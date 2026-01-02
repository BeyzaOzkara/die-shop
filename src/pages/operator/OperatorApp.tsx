import { useEffect, useState } from 'react';
import { OperatorLoginPage } from './OperatorLoginPage';
import { WorkCenterQueuePage } from './WorkCenterQueuePage';
import type { Operator } from '../../types/database';
import { getOperatorPublicById } from '../../services/operatorService';

const LS_OPERATOR_ID = 'operator_id';

export function OperatorApp() {
  const [operator, setOperator] = useState<Operator | null>(null);
  const [bootLoading, setBootLoading] = useState(true);

  useEffect(() => {
    const boot = async () => {
      const raw = localStorage.getItem(LS_OPERATOR_ID);
      if (!raw) {
        setBootLoading(false);
        return;
      }

      const id = Number(raw);
      if (!id) {
        localStorage.removeItem(LS_OPERATOR_ID);
        setBootLoading(false);
        return;
      }

      try {
        const op = await getOperatorPublicById(id);
        setOperator(op);
      } catch (e) {
        console.error('Operatör restore başarısız:', e);
        localStorage.removeItem(LS_OPERATOR_ID);
        setOperator(null);
      } finally {
        setBootLoading(false);
      }
    };

    boot();
  }, []);

  const handleLogin = (loggedInOperator: Operator) => {
    setOperator(loggedInOperator);
    localStorage.setItem(LS_OPERATOR_ID, String(loggedInOperator.id));
  };

  const handleLogout = () => {
    if (confirm('Çıkış yapmak istediğinizden emin misiniz?')) {
      setOperator(null);
      localStorage.removeItem(LS_OPERATOR_ID);
    }
  };

  if (bootLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Yükleniyor...
      </div>
    );
  }

  if (!operator) {
    return <OperatorLoginPage onLogin={handleLogin} />;
  }

  return <WorkCenterQueuePage operator={operator} onLogout={handleLogout} />;
}
