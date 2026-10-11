'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Minus, Plus, RefreshCw } from 'lucide-react';

type MermaidDiagramProps = {
  chart: string;
};

function normalizeSvgDimensions(input: string): string {
  // Mermaid often emits width="100%". In transformed/pannable containers this can
  // collapse to 0px. Force explicit width/height from viewBox for stable rendering.
  const match = input.match(/viewBox="([\d.\s-]+)"/i);
  if (!match) return input;
  const parts = match[1].trim().split(/\s+/).map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return input;
  const vbWidth = Math.max(1, Math.round(parts[2]));
  const vbHeight = Math.max(1, Math.round(parts[3]));

  return input.replace(/<svg([^>]*?)>/i, (_m, attrs: string) => {
    const cleaned = attrs
      .replace(/\swidth="[^"]*"/i, '')
      .replace(/\sheight="[^"]*"/i, '');
    return `<svg${cleaned} width="${vbWidth}" height="${vbHeight}">`;
  });
}

export default function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const fitScaleRef = useRef(1);

  const STEP = 48;
  const MIN_SCALE = 0.4;
  const MAX_SCALE = 3;

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function renderChart() {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: 'base',
          securityLevel: 'loose',
          suppressErrorRendering: true,
          fontFamily: 'inherit',
          themeVariables: {
            darkMode: true,
            background: '#000000',
            primaryColor: '#141414',
            primaryTextColor: '#ffffff',
            primaryBorderColor: '#ccff00',
            secondaryColor: '#1c1c1c',
            secondaryTextColor: '#ffffff',
            secondaryBorderColor: '#ccff00',
            tertiaryColor: '#0b0b0b',
            tertiaryTextColor: '#9a9590',
            tertiaryBorderColor: '#2a2a2a',
            lineColor: '#9a9590',
            textColor: '#ffffff',
            mainBkg: '#141414',
            nodeBorder: '#ccff00',
            clusterBkg: '#101010',
            clusterBorder: '#2a2a2a',
            titleColor: '#ccff00',
            edgeLabelBackground: '#000000',
            nodeTextColor: '#ffffff',
            actorBkg: '#141414',
            actorBorder: '#ccff00',
            actorTextColor: '#ffffff',
            actorLineColor: '#4d4a46',
            signalColor: '#ccff00',
            signalTextColor: '#ffffff',
            labelBoxBkgColor: '#141414',
            labelBoxBorderColor: '#2a2a2a',
            labelTextColor: '#ffffff',
            loopTextColor: '#9a9590',
            noteBorderColor: '#2a2a2a',
            noteBkgColor: '#141414',
            noteTextColor: '#ffffff',
            activationBorderColor: '#ccff00',
            activationBkgColor: '#1a1a1a',
            sequenceNumberColor: '#ccff00',
          },
        });

        const id = `mermaid-${Math.random().toString(36).slice(2, 10)}`;
        const { svg: rendered } = await mermaid.render(id, chart);
        if (mounted) {
          setSvg(normalizeSvgDimensions(rendered));
          setError('');
        }
      } catch (e: unknown) {
        if (mounted) {
          setError(e instanceof Error ? e.message : 'Failed to render Mermaid diagram');
        }
      }
    }

    renderChart();

    return () => {
      mounted = false;
    };
  }, [chart]);

  useEffect(() => {
    // Fit to viewport each time a new diagram is rendered.
    if (!svg) return;
    const vp = viewportRef.current;
    const canvas = canvasRef.current;
    if (!vp || !canvas) return;
    // Wait one tick so browser applies SVG layout.
    const t = setTimeout(() => {
      const vpRect = vp.getBoundingClientRect();
      const svgEl = canvas.querySelector('svg');
      if (!vpRect.width || !svgEl) return;

      const mobile = vpRect.width < 640;
      if (mobile) {
        svgEl.style.maxWidth = '100%';
        svgEl.style.width = '100%';
        svgEl.style.height = 'auto';
        fitScaleRef.current = 1;
        setScale(1);
        setOffset({ x: 0, y: 0 });
        vp.style.height = 'auto';
        return;
      }

      svgEl.style.maxWidth = '';
      svgEl.style.width = '';
      svgEl.style.height = '';
      vp.style.height = '';
      const contentRect = canvas.getBoundingClientRect();
      if (!contentRect.width || !contentRect.height || !vpRect.height) return;
      const fitScale = Math.min(vpRect.width / contentRect.width, vpRect.height / contentRect.height);
      const clamped = Math.max(MIN_SCALE, Math.min(MAX_SCALE, fitScale * 0.95));
      fitScaleRef.current = clamped;
      setScale(clamped);
      setOffset({ x: 0, y: 0 });
    }, 0);
    return () => clearTimeout(t);
  }, [svg]);

  const controls = useMemo(
    () => [
      { label: 'Up', icon: ArrowUp, onClick: () => setOffset((o) => ({ ...o, y: o.y + STEP })) },
      { label: 'Zoom In', icon: Plus, onClick: () => setScale((s) => Math.min(MAX_SCALE, +(s + 0.1).toFixed(2))) },
      { label: 'Left', icon: ArrowLeft, onClick: () => setOffset((o) => ({ ...o, x: o.x + STEP })) },
      { label: 'Reset', icon: RefreshCw, onClick: () => { setScale(fitScaleRef.current); setOffset({ x: 0, y: 0 }); } },
      { label: 'Right', icon: ArrowRight, onClick: () => setOffset((o) => ({ ...o, x: o.x - STEP })) },
      { label: 'Down', icon: ArrowDown, onClick: () => setOffset((o) => ({ ...o, y: o.y - STEP })) },
      { label: 'Zoom Out', icon: Minus, onClick: () => setScale((s) => Math.max(MIN_SCALE, +(s - 0.1).toFixed(2))) },
    ],
    [],
  );

  if (error) {
    return (
      <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
        Mermaid render error: {error}
      </div>
    );
  }

  if (!svg) {
    return <div className="text-xs text-white/40">Rendering diagram...</div>;
  }

  return (
    <div className="space-y-3">
      <div
        ref={viewportRef}
        className="relative h-auto overflow-hidden rounded-xl border border-[#2a2a2a] bg-black sm:h-[480px]"
        onMouseDown={(e) => {
          setDragging(true);
          dragStart.current = { x: e.clientX, y: e.clientY };
        }}
        onMouseMove={(e) => {
          if (!dragging || !dragStart.current) return;
          const dx = e.clientX - dragStart.current.x;
          const dy = e.clientY - dragStart.current.y;
          dragStart.current = { x: e.clientX, y: e.clientY };
          setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
        }}
        onMouseUp={() => {
          setDragging(false);
          dragStart.current = null;
        }}
        onMouseLeave={() => {
          setDragging(false);
          dragStart.current = null;
        }}
        onWheel={(e) => {
          e.preventDefault();
          const delta = e.deltaY < 0 ? 0.08 : -0.08;
          setScale((s) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, +(s + delta).toFixed(2))));
        }}
      >
        <div className="absolute inset-0 grid place-items-center">
          <div
            ref={canvasRef}
            style={{
              transform: narrow ? undefined : `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              transformOrigin: 'center center',
              transition: dragging ? 'none' : 'transform 120ms ease',
              cursor: narrow ? 'default' : dragging ? 'grabbing' : 'grab',
            }}
            className="mermaid-diagram w-full select-none [&_svg]:h-auto [&_svg]:max-w-full max-sm:[&_svg]:!w-full sm:[&_svg]:w-auto sm:[&_svg]:max-w-none [&_img]:inline-block [&_img]:h-[22px] [&_img]:w-[22px] [&_img]:object-contain [&_img]:align-middle [&_img]:mr-1.5"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {controls.map(({ label, icon: Icon, onClick }) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            className="rounded-full border border-[#2a2a2a] p-2.5 text-[#9a9590] hover:border-[#ccff00] hover:text-white"
            aria-label={label}
            title={label}
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
        <span className="ml-1 text-xs text-[#4d4a46]">{Math.round(scale * 100)}%</span>
      </div>
    </div>
  );
}

