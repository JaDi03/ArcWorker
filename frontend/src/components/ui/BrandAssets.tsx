import React from 'react';
import Image from 'next/image';

// NOTE: Ensure these files exist in public/assets/branding/
const ASSET_PATH = '/assets/branding';

export const ArcWorkerLogo = ({ className = "w-32 h-auto" }: { className?: string }) => (
    <div className={`relative ${className} flex items-center justify-center`}>
        {/* Using Next.js Image for optimization, utilizing intrinsic ratio */}
        <Image
            src={`${ASSET_PATH}/arcworker-full.png`}
            alt="ArcWorker Protocol"
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-contain"
            priority
        />
    </div>
);

// New Icon Component
export const ArcWorkerIcon = ({ className = "w-16 h-16" }: { className?: string }) => (
    <div className={`relative ${className} flex items-center justify-center`}>
        <Image
            src={`${ASSET_PATH}/arcworker-icon.png`}
            alt="ArcWorker Icon"
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-contain"
            priority
        />
    </div>
);

export const CircleLogo = ({ className = "w-24 h-auto" }: { className?: string }) => (
    <div className={`relative ${className} flex items-center justify-center`}>
        <Image
            src={`${ASSET_PATH}/circle-logo-text.png`}
            alt="Circle"
            width={120}
            height={30}
            className="object-contain"
            style={{ width: 'auto', height: 'auto' }}
        />
    </div>
);

export const CircleLogoLanding = ({ className = "w-24 h-auto" }: { className?: string }) => (
    <div className={`relative ${className} flex items-center justify-center`}>
        <Image
            src={`${ASSET_PATH}/circle-logo-text2.png`}
            alt="Circle Secured"
            width={400}
            height={100}
            className="object-contain"
            priority /* Ensure high priority loading for sharpness */
            style={{ width: 'auto', height: 'auto' }}
        />
    </div>
);

export const MetamaskLogo = ({ className = "" }: { className?: string }) => (
    <div className={`flex items-center justify-center ${className}`}>
        <Image
            src={`${ASSET_PATH}/metamask-fox.png`}
            alt="Metamask"
            width={180}
            height={45}
            className="object-contain"
            priority
            style={{ width: 'auto', height: 'auto' }}
        />
    </div>
);

export const ArcWorkerCardLogo = ({ className = "" }: { className?: string }) => (
    <div className={`relative flex items-center justify-center ${className}`}>
        <Image
            src={`${ASSET_PATH}/arcworker-card.png`}
            alt="ArcWorker Protocol"
            width={320}
            height={80}
            className="object-contain"
            priority
            style={{ width: 'auto', height: 'auto' }}
        />
    </div>
);

export const CircleCardLogo = ({ className = "" }: { className?: string }) => (
    <div className={`relative flex items-center justify-center ${className}`}>
        <Image
            src={`${ASSET_PATH}/circle-card.png`}
            alt="Secured by Circle"
            width={100}
            height={30}
            className="object-contain"
            style={{ width: 'auto', height: 'auto' }}
        />
    </div>
);
export const ArcNetworkLogo = ({ className = "w-32 h-auto" }: { className?: string }) => (
    <div className={`relative ${className} flex items-center justify-center`}>
        <Image
            src={`${ASSET_PATH}/Arc_Logo_Black.png`}
            alt="Arc Network"
            width={320}
            height={80}
            className="object-contain"
            priority
            style={{ width: 'auto', height: 'auto' }}
        />
    </div>
);
