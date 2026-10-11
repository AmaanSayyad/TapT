'use client';

import dynamic from 'next/dynamic';
import React from 'react';

export { PUSH_CONNECT_EVENT } from './PushProviderInner';

// SSR-safe: @pushchain/ui-kit uses browser APIs at module init time
const PushProviderInner = dynamic(
    () => import('./PushProviderInner'),
    { ssr: false }
);

export function PushProvider() {
    return <PushProviderInner />;
}
