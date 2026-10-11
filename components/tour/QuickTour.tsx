'use client';

import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';

function overlaps(box: { left: number; top: number; width: number; height: number }, target: DOMRect, margin = 12) {
    return !(
        box.left + box.width + margin <= target.left ||
        target.right + margin <= box.left ||
        box.top + box.height + margin <= target.top ||
        target.bottom + margin <= box.top
    );
}

function placeTourCard(
    target: DOMRect,
    hint: TourStep['position'],
    width: number,
    height: number,
) {
    const pad = 16;
    const gap = 18;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cardHeight = Math.min(height, vh - pad * 2);
    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

    const spots = {
        right: { left: target.right + gap, top: target.top + target.height / 2 - cardHeight / 2 },
        above: { left: target.left + target.width / 2 - width / 2, top: target.top - cardHeight - gap },
        below: { left: target.left + target.width / 2 - width / 2, top: target.bottom + gap },
        left: { left: target.left - width - gap, top: target.top + target.height / 2 - cardHeight / 2 },
    };

    const order: Array<keyof typeof spots> =
        hint === 'bottom' ? ['below', 'above', 'right', 'left']
        : hint === 'top' ? ['above', 'below', 'right', 'left']
        : hint === 'right' ? ['left', 'above', 'below', 'right']
        : ['right', 'above', 'below', 'left'];

    const placed = order.map((key) => {
        const spot = spots[key];
        const left = clamp(spot.left, pad, Math.max(pad, vw - width - pad));
        const top = clamp(spot.top, pad, Math.max(pad, vh - cardHeight - pad));
        const shifted = Math.abs(left - spot.left) + Math.abs(top - spot.top);
        return { left, top, shifted, hits: overlaps({ left, top, width, height: cardHeight }, target) };
    });

    return placed.find((spot) => !spot.hits && spot.shifted < 8)
        ?? placed.find((spot) => !spot.hits)
        ?? placed.slice().sort((a, b) => a.shifted - b.shifted)[0];
}

interface TourStep {
    id: string;
    target: string;
    fallback?: string;
    title: string;
    content: string;
    howTo?: string[];
    win?: string;
    position: 'top' | 'bottom' | 'left' | 'right';
}

export const QuickTour: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const [cardHeight, setCardHeight] = useState(280);
    const cardRef = useRef<HTMLDivElement>(null);

    const isConnected = useStore(state => state.isConnected);
    const setActiveTab = useStore(state => state.setActiveTab);
    const setGameMode = useStore(state => state.setGameMode);
    const setIsIndicatorsOpen = useStore(state => state.setIsIndicatorsOpen);

    const steps: TourStep[] = useMemo(() => [
        {
            id: 'price',
            target: '[data-tour="price-display"]',
            title: 'The live price',
            content: 'The number and the lime line are the price a round settles on. If a name has no quote, it stays blank and is not settled.',
            howTo: [
                'The price refreshes about once a second.',
                'The line on the chart is that same price.',
            ],
            position: 'bottom',
        },
        {
            id: 'asset',
            target: '[data-tour="asset-selector"]',
            title: 'Pick a market',
            content: 'Trade crypto, stocks, metals, and FX. The chart follows the name you select.',
            howTo: [
                'Open the asset menu.',
                'Choose a name. The chart switches immediately.',
                'Names you pin show up as chips under the menu.',
            ],
            position: 'bottom',
        },
        {
            id: 'connect',
            target: '[data-tour="connect-button"]',
            title: isConnected ? 'Your wallet' : 'Connect a chain',
            content: isConnected
                ? 'You are connected. Each chain has its own house balance and its own play asset.'
                : 'Connect the chain you want to play on. Each chain uses one play asset.',
            howTo: [
                'Robinhood Chain uses ETH. Solana uses SOL. Base uses USDC.',
                'Arbitrum uses ETH. Tempo uses OUSD.',
                'Demo in the header loads a practice balance if you want to click through first.',
            ],
            position: 'bottom',
        },
        {
            id: 'wallet',
            target: '[data-tour="deposit-section"]',
            fallback: '[data-tour="wallet-tab"]',
            title: 'House balance',
            content: 'A round does not send a transaction. It debits the house balance for this chain. A win pays the stake times the multiplier back into that balance. A miss pays zero.',
            howTo: [
                'Open Wallet and deposit to the treasury for this chain.',
                'Withdraw from the same balance.',
                'A fee is taken on deposits and withdrawals.',
            ],
            position: 'left',
        },
        {
            id: 'modes',
            target: '[data-tour="game-mode-toggle"]',
            title: 'Three ways to trade',
            content: 'Classic is higher or lower. Box is a cell on the grid. Draw is a band you mark on the chart.',
            howTo: [
                'Switch with these three buttons.',
                'The stake sits on the Bet tab for every mode.',
            ],
            position: 'left',
        },
        {
            id: 'stake',
            target: '[data-tour="stake-controls"]',
            title: 'Stake and time',
            content: 'Set how much to risk, then how long the round runs. Classic runs from 5 seconds to 1 minute.',
            howTo: [
                'Tap a preset or type a stake in this chain’s play asset.',
                'Classic pays 1.75× at 5s, then 1.80×, 1.85×, 1.90×, and 1.95× at 1 minute.',
                'Box and Draw show their own multiplier on the cell or the box you mark.',
            ],
            position: 'left',
        },
        {
            id: 'direction',
            target: '[data-tour="direction-buttons"]',
            title: 'Higher or lower',
            content: 'Classic is a direction on the close. The stake leaves the house balance when you tap.',
            howTo: [
                'Higher wins if the close is above the price at entry.',
                'Lower wins if the close is below it.',
                'A tie loses.',
            ],
            win: 'A win pays stake × the multiplier on the time you picked. A miss pays zero.',
            position: 'left',
        },
        {
            id: 'box',
            target: '[data-tour="box-mode"]',
            title: 'Box',
            content: 'The chart becomes a grid of price cells. Tap one. Cells farther from the live price pay more.',
            howTo: [
                'Set the stake first.',
                'Tap a cell in a future time column.',
                'The multiplier is printed on the cell.',
            ],
            win: 'You win if the price is inside that cell when the column expires.',
            position: 'left',
        },
        {
            id: 'draw',
            target: '[data-tour="draw-mode"]',
            title: 'Draw',
            content: 'You mark both the price band and the time by dragging on the chart, to the right of the live price.',
            howTo: [
                'Set the stake, then drag a rectangle on the chart.',
                'Height is the price band, up to 20% of the chart. Width is the time, up to 20 seconds.',
                'Release to preview the multiplier, then confirm.',
            ],
            win: 'You win if the close at the end of the box is inside the band you drew.',
            position: 'left',
        },
        {
            id: 'blitz',
            target: '[data-tour="blitz-panel"]',
            fallback: '[data-tour="blitz-tab"]',
            title: 'Blitz',
            content: 'Blitz is an overlay on Box, not a fourth mode. A window opens every 3 minutes and doubles the marked cells.',
            howTo: [
                'The entry fee is paid on-chain, separate from the house balance.',
                'Once you are in, marked Box cells pay double until the timer ends.',
            ],
            position: 'left',
        },
        {
            id: 'indicators',
            target: '[data-tour="indicators-panel"]',
            fallback: '[data-tour="indicators-trigger"]',
            title: 'Indicators',
            content: 'These sit on the chart. They do not change how a round settles.',
            howTo: [
                'Moving average is the last 20 prices.',
                'Bollinger wraps that average. Alligator draws jaw, teeth, and lips.',
                'RSI sits in its own panel under the price.',
            ],
            position: 'left',
        },
        {
            id: 'history',
            target: '[data-tour="history-panel"]',
            fallback: '[data-tour="active-bets"]',
            title: 'History',
            content: 'Your last settled trades, with the payout in this chain’s play asset.',
            howTo: [
                'Green is a win. Red is a miss.',
                'It keeps the last 10 rounds from this session.',
            ],
            position: 'left',
        },
        {
            id: 'board',
            target: '[data-tour="board-link"]',
            title: 'The board',
            content: 'The leaderboard ranks settled rounds by net profit.',
            howTo: [
                'Open Leaderboard from the header.',
                'Filter by chain so the profit stays in one play asset.',
                'Your rank appears once this wallet has a settled round.',
            ],
            position: 'bottom',
        },
    ], [isConnected]);

    const findTarget = useCallback((step: TourStep | undefined) => {
        if (!step) return null;
        return document.querySelector(step.target) || (step.fallback ? document.querySelector(step.fallback) : null);
    }, []);

    useEffect(() => {
        if (!isOpen) {
            setCurrentStep(0);
            setTargetRect(null);
            setIsIndicatorsOpen(false);
            window.dispatchEvent(new Event('tapt-tour-history-close'));
            return;
        }

        const step = steps[currentStep];
        if (!step) return;

        if (step.id === 'wallet') setActiveTab('wallet');
        else if (step.id === 'blitz') setActiveTab('blitz');
        else setActiveTab('bet');
        if (step.id === 'box' || step.id === 'blitz') setGameMode('box');
        else if (step.id === 'draw') setGameMode('draw');
        else setGameMode('binomo');

        setIsIndicatorsOpen(step.id === 'indicators');
        window.dispatchEvent(new Event(step.id === 'history' ? 'tapt-tour-history' : 'tapt-tour-history-close'));
    }, [currentStep, isOpen, steps, setGameMode, setActiveTab, setIsIndicatorsOpen]);

    const updateTargetRect = useCallback(() => {
        const element = findTarget(steps[currentStep]);
        if (element) setTargetRect(element.getBoundingClientRect());
    }, [currentStep, steps, findTarget]);

    useEffect(() => {
        if (!isOpen) return;
        const step = steps[currentStep];
        let attempts = 0;
        const tick = () => {
            const element = findTarget(step);
            if (element) {
                const tall = step?.id === 'wallet' || step?.id === 'stake' || step?.id === 'blitz';
                element.scrollIntoView({ behavior: 'smooth', block: tall ? 'nearest' : 'center', inline: 'nearest' });
                setTargetRect(element.getBoundingClientRect());
                return;
            }
            attempts += 1;
            if (attempts < 12) window.setTimeout(tick, 150);
        };
        const start = window.setTimeout(tick, 80);
        window.addEventListener('resize', updateTargetRect);
        window.addEventListener('scroll', updateTargetRect, true);
        return () => {
            window.clearTimeout(start);
            window.removeEventListener('resize', updateTargetRect);
            window.removeEventListener('scroll', updateTargetRect, true);
        };
    }, [isOpen, currentStep, steps, updateTargetRect, findTarget]);

    useLayoutEffect(() => {
        const el = cardRef.current;
        if (!el) return;
        const measure = () => {
            const next = Math.ceil(el.getBoundingClientRect().height);
            setCardHeight((prev) => (prev === next ? prev : next));
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(el);
        return () => observer.disconnect();
    }, [isOpen, currentStep, targetRect]);

    if (!isOpen || !targetRect) return null;

    const currentStepData = steps[currentStep];
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    const tooltipWidth = isMobile ? Math.min(window.innerWidth - 24, 360) : 360;

    const pos = placeTourCard(targetRect, currentStepData.position, tooltipWidth, cardHeight);

    const finish = () => {
        onClose();
        setCurrentStep(0);
    };

    return (
        <div className="fixed inset-0 z-[120] pointer-events-none">
            <svg className="absolute inset-0 h-full w-full pointer-events-auto">
                <defs>
                    <mask id="tour-mask">
                        <rect width="100%" height="100%" fill="white" />
                        <rect
                            x={targetRect.left - 8}
                            y={targetRect.top - 8}
                            width={targetRect.width + 16}
                            height={targetRect.height + 16}
                            rx="16"
                            fill="black"
                        />
                    </mask>
                </defs>
                <rect
                    width="100%"
                    height="100%"
                    fill="rgba(0, 0, 0, 0.72)"
                    mask="url(#tour-mask)"
                    onClick={finish}
                />
            </svg>

            <motion.div
                initial={false}
                animate={{
                    left: targetRect.left - 8,
                    top: targetRect.top - 8,
                    width: targetRect.width + 16,
                    height: targetRect.height + 16,
                }}
                className="pointer-events-none absolute rounded-2xl border-2 border-[#ccff00] shadow-[0_0_0_1px_rgba(204,255,0,0.35)]"
            />

            <motion.div
                ref={cardRef}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0, left: pos.left, top: pos.top }}
                transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                className="absolute z-10 flex max-h-[min(420px,calc(100dvh-2rem))] flex-col overflow-hidden rounded-2xl border border-[#2a2a2a] bg-[#101010] shadow-2xl pointer-events-auto"
                style={{ width: tooltipWidth }}
            >
                <div className="shrink-0 px-4 pt-4">
                    <div className="mb-3 h-1 overflow-hidden rounded-full bg-[#2a2a2a]">
                        <div
                            className="h-full bg-[#ccff00]"
                            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                        />
                    </div>
                    <div className="mb-2 flex items-start justify-between gap-3">
                        <h3 className="text-base font-medium text-white">{currentStepData.title}</h3>
                        <span className="shrink-0 font-mono text-xs text-[#4d4a46]">
                            {currentStep + 1}/{steps.length}
                        </span>
                    </div>
                </div>

                <div className="max-h-[min(280px,46dvh)] space-y-3 overflow-y-auto px-4">
                    <p className="text-sm leading-6 text-[#9a9590]">{currentStepData.content}</p>
                    {currentStepData.howTo && currentStepData.howTo.length > 0 && (
                        <ol className="space-y-2">
                            {currentStepData.howTo.map((item, i) => (
                                <li key={item} className="flex items-start gap-2.5 text-sm leading-5 text-white">
                                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ccff00] text-[11px] font-medium text-[#110e08]">
                                        {i + 1}
                                    </span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ol>
                    )}
                    {currentStepData.win && (
                        <p className="rounded-xl border border-[#ccff00]/30 bg-[#ccff00]/10 px-3 py-2 text-sm leading-5 text-white">
                            {currentStepData.win}
                        </p>
                    )}
                </div>

                <div className="mt-3 flex shrink-0 items-center justify-between border-t border-[#232323] px-4 py-3">
                    <button type="button" onClick={finish} className="text-sm text-[#9a9590] hover:text-white">
                        Skip
                    </button>
                    <div className="flex gap-2">
                        {currentStep > 0 && (
                            <button
                                type="button"
                                onClick={() => setCurrentStep(currentStep - 1)}
                                className="ghost-btn h-9 px-4 text-sm"
                            >
                                Back
                            </button>
                        )}
                        <button type="button" onClick={() => (currentStep < steps.length - 1 ? setCurrentStep(currentStep + 1) : finish())} className="neon-btn h-9 px-4 text-sm">
                            {currentStep === steps.length - 1 ? 'Done' : 'Next'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
