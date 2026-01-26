import { useMemo } from 'react';

interface DateDisplayProps {
    date: string | Date | null | undefined;
    showTime?: boolean;
    className?: string;
    fallback?: string;
}

export function DateDisplay({
    date,
    showTime = true,
    className = '',
    fallback = '-'
}: DateDisplayProps) {
    const formatted = useMemo(() => {
        if (!date) return fallback;

        try {
            const d = new Date(date);
            // Check for invalid date
            if (isNaN(d.getTime())) return fallback;

            return new Intl.DateTimeFormat('tr-TR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                ...(showTime && {
                    hour: '2-digit',
                    minute: '2-digit',
                }),
            }).format(d);
        } catch {
            return fallback;
        }
    }, [date, showTime, fallback]);

    return <span className={`font-mono text-sm text-gray-600 ${className}`}>{formatted}</span>;
}
