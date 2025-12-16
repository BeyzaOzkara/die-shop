import { useState, useEffect } from 'react';
import { OperatorLoginPage } from './OperatorLoginPage';
import { WorkCenterQueuePage } from './WorkCenterQueuePage';
import type { Operator } from '../../types/database';

export function OperatorApp() {
  const [operator, setOperator] = useState<Operator | null>(null);

  useEffect(() => {
    const storedOperator = localStorage.getItem('operator');
    if (storedOperator) {
      try {
        setOperator(JSON.parse(storedOperator));
      } catch (error) {
        console.error('Operatör bilgisi yüklenemedi:', error);
        localStorage.removeItem('operator');
      }
    }
  }, []);

  const handleLogin = (loggedInOperator: Operator) => {
    setOperator(loggedInOperator);
    localStorage.setItem('operator', JSON.stringify(loggedInOperator));
  };

  const handleLogout = () => {
    if (confirm('Çıkış yapmak istediğinizden emin misiniz?')) {
      setOperator(null);
      localStorage.removeItem('operator');
    }
  };

  if (!operator) {
    return <OperatorLoginPage onLogin={handleLogin} />;
  }

  return <WorkCenterQueuePage operator={operator} onLogout={handleLogout} />;
}
