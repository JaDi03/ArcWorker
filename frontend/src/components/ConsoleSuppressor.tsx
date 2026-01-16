'use client';

import { useEffect } from 'react';

export function ConsoleSuppressor() {
    useEffect(() => {
        // Safe check for window
        if (typeof window === 'undefined') return;

        const originalError = console.error;
        const originalWarn = console.warn;
        const originalLog = console.log;

        const shouldSuppress = (args: any[]) => {
            if (args.length > 0 && typeof args[0] === 'string') {
                const msg = args[0];
                return (
                    msg.includes('Datadog') ||
                    msg.includes('Application ID is not configured')
                );
            }
            return false;
        };

        console.error = (...args: any[]) => {
            if (shouldSuppress(args)) return;
            originalError.apply(console, args);
        };

        console.warn = (...args: any[]) => {
            if (shouldSuppress(args)) return;
            originalWarn.apply(console, args);
        };

        console.log = (...args: any[]) => {
            if (shouldSuppress(args)) return;
            originalLog.apply(console, args);
        };
    }, []);

    return null;
}
