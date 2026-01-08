import { W3SSdk } from '@circle-fin/w3s-pw-web-sdk';

declare global {
    interface Window {
        __circle_sdk_instance?: W3SSdk;
    }
}

export function getSdk() {
    if (typeof window === 'undefined') return null;
    if (!window.__circle_sdk_instance) {
        const appId = process.env.NEXT_PUBLIC_CIRCLE_APP_ID || '';
        window.__circle_sdk_instance = new W3SSdk({
            appSettings: { appId }
        });
    }
    return window.__circle_sdk_instance;
}
