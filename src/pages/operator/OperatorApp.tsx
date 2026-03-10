import { useEffect, useState, useRef, useCallback } from 'react';
import { OperatorLoginPage } from './OperatorLoginPage';
import { WorkCenterQueuePage } from './WorkCenterQueuePage';
import type { Operator } from '../../types/database';
import { getOperatorPublicById } from '../../services/operatorService';

const LS_OPERATOR_ID = 'operator_id';

/** Idle timeout in ms before showing the warning */
const IDLE_TIMEOUT_MS = 60_000; // 60 seconds

/** Countdown seconds shown in the warning modal before auto-logout */
const WARN_SECONDS = 10;

/** DOM event names that count as "activity" */
const ACTIVITY_EVENTS: (keyof DocumentEventMap)[] = [
  'mousemove',
  'mousedown',
  'keydown',
  'touchstart',
  'click',
  'scroll',
];

export function OperatorApp() {
  const [operator, setOperator] = useState<Operator | null>(null);
  const [bootLoading, setBootLoading] = useState(true);

  
  // Inactivity / countdown state
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(WARN_SECONDS);

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep a ref to showWarning so resetIdleTimer can read it
  // WITHOUT becoming a dep of the activity useEffect (which would kill timers).
  const showWarningRef = useRef(false);
  useEffect(() => { showWarningRef.current = showWarning; }, [showWarning]);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const performLogout = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setOperator(null);
    localStorage.removeItem(LS_OPERATOR_ID);
    setShowWarning(false);
    showWarningRef.current = false;
    setCountdown(WARN_SECONDS);
  }, []);

  // const clearTimers = useCallback(() => {
  /** Start the idle timer (does NOT touch the countdown interval). */
  const scheduleIdleTimeout = useCallback((onFire: () => void) => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    // if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    idleTimerRef.current = setTimeout(onFire, IDLE_TIMEOUT_MS);
  }, []);

  /** Open warning modal and start the 10-second countdown. */
  const startCountdown = useCallback(() => {
    setShowWarning(true);
    showWarningRef.current = true;
    setCountdown(WARN_SECONDS);
    // Clear any previous countdown
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

    let remaining = WARN_SECONDS;
    countdownTimerRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(countdownTimerRef.current!);
        // performLogout();
        countdownTimerRef.current = null;
        // Use functional update to avoid stale closure on setOperator
        setOperator(null);
        localStorage.removeItem(LS_OPERATOR_ID);
        setShowWarning(false);
        showWarningRef.current = false;
        setCountdown(WARN_SECONDS);
      }
    }, 1000);
  }, []);
  // }, [performLogout]);

  /** Called on any user activity — resets the idle timer only when NOT in warning mode. */
  const resetIdleTimer = useCallback(() => {
        if (showWarningRef.current) return; // ignore activity during warning
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(startCountdown, IDLE_TIMEOUT_MS);
  }, [startCountdown]); // startCountdown is stable — no showWarning dep here

  const cancelWarning = useCallback(() => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    countdownTimerRef.current = null;
    setShowWarning(false);
    showWarningRef.current = false;
    setCountdown(WARN_SECONDS);
    // Restart idle timer
    idleTimerRef.current = setTimeout(startCountdown, IDLE_TIMEOUT_MS);
  }, [startCountdown]);

  // ─── Activity listener ───────────────────────────────────────────────────

  useEffect(() => {
    if (!operator) return; // Only active when logged in

    // Attach listeners
    ACTIVITY_EVENTS.forEach((ev) => document.addEventListener(ev, resetIdleTimer));

    // Start timer
    idleTimerRef.current = setTimeout(startCountdown, IDLE_TIMEOUT_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((ev) => document.removeEventListener(ev, resetIdleTimer));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [operator]);

  // ─── Boot: restore session from localStorage ─────────────────────────────


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
      // setOperator(null);
      // localStorage.removeItem(LS_OPERATOR_ID);
      performLogout();
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

//   return <WorkCenterQueuePage operator={operator} onLogout={handleLogout} />;
// }
 return (
    <>
      <WorkCenterQueuePage operator={operator} onLogout={handleLogout} />

      {/* ── Inactivity warning modal ── */}
      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
            {/* Countdown ring */}
            <div className="flex items-center justify-center mb-4">
              <div className="relative w-20 h-20">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                  <circle
                    cx="40" cy="40" r="34"
                    fill="none" stroke="#e5e7eb" strokeWidth="8"
                  />
                  <circle
                    cx="40" cy="40" r="34"
                    fill="none"
                    stroke={countdown <= 3 ? '#ef4444' : '#f59e0b'}
                    strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 34}`}
                    strokeDashoffset={`${2 * Math.PI * 34 * (1 - countdown / WARN_SECONDS)}`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
                  />
                </svg>
                <span
                  className={`absolute inset-0 flex items-center justify-center text-2xl font-bold ${countdown <= 3 ? 'text-red-500' : 'text-amber-500'
                    }`}
                >
                  {countdown}
                </span>
              </div>
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Hareketsizlik Uyarısı
            </h2>
            <p className="text-gray-600 mb-6 text-sm">
              <span className="font-semibold text-gray-800">{operator.name}</span> olarak
              giriş yaptınız. Hareketsizlik nedeniyle{' '}
              <span className="font-semibold text-amber-600">{countdown} saniye</span>{' '}
              içinde çıkış yapılacak.
            </p>

            <div className="flex gap-3">
              <button
                onClick={performLogout}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Şimdi Çıkış Yap
              </button>
              <button
                onClick={cancelWarning}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Geri Dön
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

