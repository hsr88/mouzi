import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from 'framer-motion';

type FolderId = 'Documents' | 'Images' | 'Archives' | 'Installers' | 'Media';
type Phase = 'idle' | 'scanning' | 'applying' | 'organizing' | 'done';

interface DemoFile {
  id: string;
  name: string;
  short: string;
  ext: string;
  size: string;
  folder: FolderId;
  /** Desktop layout position as % of stage */
  x: number;
  y: number;
  rotate: number;
  /** Mobile layout */
  mx: number;
  my: number;
  mRotate: number;
  color: string;
}

interface RuleRow {
  id: string;
  label: string;
  pattern: string;
  folders: FolderId[];
}

const FILES: DemoFile[] = [
  {
    id: 'f1',
    name: 'invoice-march-final(2).pdf',
    short: 'invoice-march…pdf',
    ext: 'pdf',
    size: '412 KB',
    folder: 'Documents',
    x: 6,
    y: 14,
    rotate: -3.2,
    mx: 4,
    my: 8,
    mRotate: -2,
    color: '#E8A54B',
  },
  {
    id: 'f2',
    name: 'IMG_20260712_183355.jpg',
    short: 'IMG_202607…jpg',
    ext: 'jpg',
    size: '3.1 MB',
    folder: 'Images',
    x: 28,
    y: 10,
    rotate: 2.4,
    mx: 52,
    my: 6,
    mRotate: 2,
    color: '#7EB8A8',
  },
  {
    id: 'f3',
    name: 'node-v22.4.0-x64.msi',
    short: 'node-v22…msi',
    ext: 'msi',
    size: '31.8 MB',
    folder: 'Installers',
    x: 48,
    y: 22,
    rotate: -1.5,
    mx: 8,
    my: 28,
    mRotate: -1,
    color: '#A8B4C4',
  },
  {
    id: 'f4',
    name: 'backup-photos.zip',
    short: 'backup-photos.zip',
    ext: 'zip',
    size: '1.2 GB',
    folder: 'Archives',
    x: 12,
    y: 36,
    rotate: 3.8,
    mx: 48,
    my: 26,
    mRotate: 3,
    color: '#C9A06A',
  },
  {
    id: 'f5',
    name: 'Screenshot 2026-08-01 114233.png',
    short: 'Screenshot…png',
    ext: 'png',
    size: '284 KB',
    folder: 'Images',
    x: 38,
    y: 42,
    rotate: -2.8,
    mx: 6,
    my: 48,
    mRotate: -2,
    color: '#7EB8A8',
  },
  {
    id: 'f6',
    name: 'contract_v3_SIGNED.pdf',
    short: 'contract_v3…pdf',
    ext: 'pdf',
    size: '198 KB',
    folder: 'Documents',
    x: 58,
    y: 12,
    rotate: 1.8,
    mx: 50,
    my: 46,
    mRotate: 1.5,
    color: '#E8A54B',
  },
  {
    id: 'f7',
    name: 'holiday-video.mp4',
    short: 'holiday-video.mp4',
    ext: 'mp4',
    size: '812 MB',
    folder: 'Media',
    x: 20,
    y: 58,
    rotate: -4.1,
    mx: 10,
    my: 68,
    mRotate: -3,
    color: '#9B8EC4',
  },
  {
    id: 'f8',
    name: 'setup-obs-studio-30.exe',
    short: 'setup-obs…exe',
    ext: 'exe',
    size: '148 MB',
    folder: 'Installers',
    x: 44,
    y: 62,
    rotate: 2.2,
    mx: 52,
    my: 66,
    mRotate: 2,
    color: '#A8B4C4',
  },
  {
    id: 'f9',
    name: 'data-export (1).csv',
    short: 'data-export.csv',
    ext: 'csv',
    size: '2.4 MB',
    folder: 'Documents',
    x: 4,
    y: 72,
    rotate: 1.2,
    mx: 4,
    my: 86,
    mRotate: 1,
    color: '#E8A54B',
  },
  {
    id: 'f10',
    name: 'presentation-draft.pptx',
    short: 'presentation…pptx',
    ext: 'pptx',
    size: '9.6 MB',
    folder: 'Documents',
    x: 32,
    y: 76,
    rotate: -1.8,
    mx: 48,
    my: 86,
    mRotate: -1.5,
    color: '#E8A54B',
  },
];

const FOLDERS: { id: FolderId; hint: string }[] = [
  { id: 'Documents', hint: 'pdf · csv · pptx' },
  { id: 'Images', hint: 'jpg · png' },
  { id: 'Archives', hint: 'zip' },
  { id: 'Installers', hint: 'msi · exe' },
  { id: 'Media', hint: 'mp4' },
];

const RULES: RuleRow[] = [
  { id: 'r1', label: 'Documents', pattern: 'pdf, csv, pptx', folders: ['Documents'] },
  { id: 'r2', label: 'Images', pattern: 'jpg, png', folders: ['Images'] },
  { id: 'r3', label: 'Archives', pattern: 'zip', folders: ['Archives'] },
  { id: 'r4', label: 'Installers & media', pattern: 'msi, exe, mp4', folders: ['Installers', 'Media'] },
];

const STAGGER_MS = 110;
const MOVE_MS = 720;
const TOTAL_MS = 2400;

/**
 * Prefer the sweeping webm mascot. Set to false to fall back to the static
 * PNG + Framer Motion tilt/bounce animation.
 */
const USE_MASCOT_VIDEO = false;
const MASCOT_VIDEO_SRC = '/videos/mouzi-mascot.webm';
const MASCOT_IMAGE_SRC = '/images/mouzi-mascot.png';

function ruleForFolder(folder: FolderId): string {
  return RULES.find((r) => r.folders.includes(folder))?.id ?? 'r1';
}

function useIsMobile(breakpoint = 768) {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const sync = () => setMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [breakpoint]);
  return mobile;
}

function FileGlyph({ ext, color }: { ext: string; color: string }) {
  return (
    <span
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded border font-mono text-[9px] uppercase tracking-wide"
      style={{ borderColor: `${color}55`, color, background: `${color}14` }}
      aria-hidden="true"
    >
      {ext.slice(0, 3)}
    </span>
  );
}

function FolderShape({ active }: { active?: boolean }) {
  return (
    <svg width="22" height="18" viewBox="0 0 22 18" fill="none" aria-hidden="true">
      <path
        d="M1.5 4.5A1.5 1.5 0 0 1 3 3h5.2l1.6 1.5H19A1.5 1.5 0 0 1 20.5 6v9A1.5 1.5 0 0 1 19 16.5H3A1.5 1.5 0 0 1 1.5 15V4.5Z"
        fill={active ? 'rgba(244,178,58,0.18)' : 'rgba(244,178,58,0.08)'}
        stroke="#F4B23A"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <path d="M1.5 7.5h19" stroke="#F4B23A" strokeOpacity="0.35" strokeWidth="1" />
    </svg>
  );
}

export default function OrganizeDemo() {
  const reduceMotion = useReducedMotion();
  const mobile = useIsMobile();
  const stageRef = useRef<HTMLDivElement>(null);
  const inViewRef = useRef(true);
  const timers = useRef<number[]>([]);

  const [phase, setPhase] = useState<Phase>('idle');
  const [placed, setPlaced] = useState<Record<string, boolean>>({});
  const [moving, setMoving] = useState<string | null>(null);
  const [activeRule, setActiveRule] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<FolderId, number>>({
    Documents: 0,
    Images: 0,
    Archives: 0,
    Installers: 0,
    Media: 0,
  });
  const [pulseFolder, setPulseFolder] = useState<FolderId | null>(null);
  const [expanded, setExpanded] = useState<FolderId | null>(null);
  const [idleOn, setIdleOn] = useState(true);
  const [elapsed, setElapsed] = useState(TOTAL_MS / 1000);

  const visibleFiles = useMemo(
    () => (mobile ? FILES.filter((_, i) => i % 2 === 0 || i < 4) : FILES),
    [mobile],
  );

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  }, []);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  }, []);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        inViewRef.current = entry.isIntersecting;
        if (phase === 'idle') setIdleOn(entry.isIntersecting);
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [phase]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const reset = useCallback(() => {
    clearTimers();
    setPhase('idle');
    setPlaced({});
    setMoving(null);
    setActiveRule(null);
    setCounts({ Documents: 0, Images: 0, Archives: 0, Installers: 0, Media: 0 });
    setPulseFolder(null);
    setExpanded(null);
    setIdleOn(true);
  }, [clearTimers]);

  const runOrganize = useCallback(() => {
    if (phase !== 'idle' && phase !== 'done') return;
    clearTimers();
    setPlaced({});
    setCounts({ Documents: 0, Images: 0, Archives: 0, Installers: 0, Media: 0 });
    setExpanded(null);
    setIdleOn(false);
    setElapsed(TOTAL_MS / 1000);

    if (reduceMotion) {
      setPhase('scanning');
      schedule(() => setPhase('applying'), 200);
      schedule(() => {
        setPhase('organizing');
        const next: Record<string, boolean> = {};
        const nextCounts: Record<FolderId, number> = {
          Documents: 0,
          Images: 0,
          Archives: 0,
          Installers: 0,
          Media: 0,
        };
        visibleFiles.forEach((f) => {
          next[f.id] = true;
          nextCounts[f.folder] += 1;
        });
        setPlaced(next);
        setCounts(nextCounts);
      }, 400);
      schedule(() => {
        setPhase('done');
        setActiveRule(null);
      }, 700);
      return;
    }

    const start = performance.now();
    setPhase('scanning');
    schedule(() => setPhase('applying'), 450);
    schedule(() => setPhase('organizing'), 900);

    visibleFiles.forEach((file, i) => {
      const t0 = 950 + i * STAGGER_MS;
      schedule(() => {
        setMoving(file.id);
        setActiveRule(ruleForFolder(file.folder));
        setPulseFolder(file.folder);
      }, t0);
      schedule(() => {
        setPlaced((p) => ({ ...p, [file.id]: true }));
        setCounts((c) => ({ ...c, [file.folder]: c[file.folder] + 1 }));
        setMoving(null);
      }, t0 + MOVE_MS);
      schedule(() => setPulseFolder(null), t0 + MOVE_MS + 180);
    });

    const endAt = 950 + (visibleFiles.length - 1) * STAGGER_MS + MOVE_MS + 280;
    schedule(() => {
      setPhase('done');
      setActiveRule(null);
      setMoving(null);
      setElapsed(Number(((performance.now() - start) / 1000).toFixed(1)));
    }, endAt);
  }, [phase, clearTimers, reduceMotion, schedule, visibleFiles]);

  const undo = useCallback(() => {
    if (phase !== 'done') return;
    clearTimers();
    setIdleOn(false);
    if (reduceMotion) {
      reset();
      return;
    }
    setPhase('organizing');
    const ordered = [...visibleFiles].reverse();
    ordered.forEach((file, i) => {
      schedule(() => {
        setPulseFolder(file.folder);
        setPlaced((p) => {
          const next = { ...p };
          delete next[file.id];
          return next;
        });
        setCounts((c) => ({ ...c, [file.folder]: Math.max(0, c[file.folder] - 1) }));
      }, i * 70);
      schedule(() => setPulseFolder(null), i * 70 + 160);
    });
    schedule(() => reset(), ordered.length * 70 + 220);
  }, [phase, clearTimers, reduceMotion, reset, schedule, visibleFiles]);

  const statusLabel =
    phase === 'idle'
      ? 'Waiting'
      : phase === 'scanning'
        ? `Scanning ${visibleFiles.length} files`
        : phase === 'applying'
          ? 'Applying 4 rules'
          : phase === 'organizing'
            ? 'Organizing'
            : 'Done';

  const folderContents = useMemo(() => {
    const map: Record<FolderId, DemoFile[]> = {
      Documents: [],
      Images: [],
      Archives: [],
      Installers: [],
      Media: [],
    };
    visibleFiles.forEach((f) => {
      if (placed[f.id]) map[f.folder].push(f);
    });
    return map;
  }, [placed, visibleFiles]);

  const folderTargets: Record<FolderId, { x: string; y: string }> = mobile
    ? {
        Documents: { x: '18%', y: '88%' },
        Images: { x: '52%', y: '88%' },
        Archives: { x: '86%', y: '88%' },
        Installers: { x: '35%', y: '98%' },
        Media: { x: '70%', y: '98%' },
      }
    : {
        Documents: { x: '88%', y: '18%' },
        Images: { x: '88%', y: '34%' },
        Archives: { x: '88%', y: '50%' },
        Installers: { x: '88%', y: '66%' },
        Media: { x: '88%', y: '82%' },
      };

  const busy = phase === 'scanning' || phase === 'applying' || phase === 'organizing';
  const showMascot = busy || phase === 'done';
  const useVideoMascot = USE_MASCOT_VIDEO && !reduceMotion;
  const mascotVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = mascotVideoRef.current;
    if (!video || !USE_MASCOT_VIDEO) return;

    if (reduceMotion) {
      video.pause();
      return;
    }

    if (busy) {
      video.loop = true;
      video.playbackRate = 1;
      if (video.paused) {
        video.currentTime = 0;
        video.play().catch(() => {});
      }
    } else if (phase === 'done') {
      video.loop = false;
      video.pause();
      // Soft rest: freeze near the end of the sweep clip.
      if (Number.isFinite(video.duration) && video.duration > 0) {
        video.currentTime = Math.max(0, video.duration - 0.15);
      }
    } else {
      video.pause();
      video.currentTime = 0;
    }
  }, [busy, phase, reduceMotion]);

  const mascotVariants: Variants = {
    hidden: { opacity: 0, x: -24, y: 18, rotate: -6 },
    sweeping: {
      opacity: 1,
      x: [0, 18, 36, 52],
      y: [0, -6, -2, 4],
      rotate: [-4, 3, -2, 2],
      transition: { duration: 2.6, ease: 'easeInOut' },
    },
    resting: {
      opacity: 1,
      x: mobile ? 8 : 42,
      y: mobile ? -8 : -4,
      rotate: 4,
      transition: { type: 'spring', stiffness: 120, damping: 16 },
    },
  };
  return (
    <div className="w-full">
      <div
        ref={stageRef}
        className="relative mx-auto overflow-hidden rounded-[12px] border border-[rgba(255,255,255,0.10)] bg-[#12151A]"
        style={{
          maxWidth: 1180,
          height: mobile ? 560 : 600,
          backgroundImage:
            'radial-gradient(ellipse 80% 60% at 30% 40%, rgba(244,178,58,0.04), transparent 55%), linear-gradient(180deg, rgba(255,255,255,0.02), transparent 40%)',
        }}
      >
        {/* Header strip */}
        <div className="absolute inset-x-0 top-0 z-20 flex h-11 items-center gap-3 border-b border-[rgba(255,255,255,0.08)] bg-[#0B0D10]/70 px-4 backdrop-blur-[2px]">
          <div className="flex items-center gap-2 font-mono text-[12px] text-[#F4F1EA]/90">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
            </svg>
            <span>~/Downloads</span>
          </div>
          <div className="ml-auto flex items-center gap-2.5">
            <span
              className="inline-flex items-center gap-1.5 rounded-md border border-[rgba(255,255,255,0.10)] px-2 py-0.5 font-mono text-[10px] tracking-[0.12em] uppercase"
              style={{
                color: phase === 'done' ? '#F4B23A' : '#989DA6',
                borderColor: phase === 'done' ? 'rgba(244,178,58,0.45)' : 'rgba(255,255,255,0.10)',
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  background: phase === 'done' ? '#F4B23A' : busy ? '#F4B23A' : '#989DA6',
                  boxShadow: busy ? '0 0 0 3px rgba(244,178,58,0.15)' : undefined,
                }}
              />
              {statusLabel}
            </span>
            <span className="rounded-md border border-[rgba(255,255,255,0.10)] px-2 py-0.5 font-mono text-[10px] tracking-[0.14em] text-[#989DA6] uppercase">
              Local only
            </span>
          </div>
        </div>

        {/* Soft grid */}
        <div
          className="pointer-events-none absolute inset-0 top-11 opacity-[0.035]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(244,241,234,1) 1px, transparent 1px), linear-gradient(90deg, rgba(244,241,234,1) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
          aria-hidden="true"
        />

        {/* File tokens */}
        <div className="absolute inset-0 top-11 right-0 bottom-0 left-0">
          <AnimatePresence>
            {visibleFiles.map((file) => {
              if (placed[file.id]) return null;
              const isMoving = moving === file.id;
              const target = folderTargets[file.folder];
              const left = mobile ? file.mx : file.x;
              const top = mobile ? file.my : file.y;
              const rot = mobile ? file.mRotate : file.rotate;

              const midX = left + (parseFloat(target.x) - left) * 0.5;
              const midY = top + (parseFloat(target.y) - top) * 0.4 - 4;

              return (
                <motion.div
                  key={file.id}
                  className="absolute z-10"
                  style={{ width: mobile ? '44%' : undefined }}
                  initial={false}
                  animate={
                    isMoving
                      ? {
                          left: [`${left}%`, `${midX}%`, target.x],
                          top: [`${top}%`, `${midY}%`, target.y],
                          x: ['0%', '-30%', '-50%'],
                          y: ['0%', '-30%', '-50%'],
                          rotate: [rot, rot * 0.25, 0],
                          opacity: [1, 1, 0],
                          scale: [1, 0.9, 0.52],
                        }
                      : {
                          left: `${left}%`,
                          top: `${top}%`,
                          x: '0%',
                          y: idleOn && !reduceMotion ? ['0%', '-2%', '0%'] : '0%',
                          rotate: rot,
                          opacity: 1,
                          scale: 1,
                        }
                  }
                  transition={
                    isMoving
                      ? {
                          duration: MOVE_MS / 1000,
                          ease: [0.22, 0.8, 0.2, 1],
                          times: [0, 0.45, 1],
                        }
                      : idleOn && !reduceMotion
                        ? {
                            y: { duration: 3.4 + Math.abs(file.rotate) * 0.15, repeat: Infinity, ease: 'easeInOut' },
                          }
                        : { duration: 0.35 }
                  }
                  exit={
                    reduceMotion
                      ? { opacity: 0, transition: { duration: 0.25 } }
                      : undefined
                  }
                >
                  {isMoving && !reduceMotion && (
                    <motion.span
                      className="pointer-events-none absolute inset-0 -z-10 rounded-md"
                      style={{
                        background:
                          'radial-gradient(ellipse at center, rgba(244,178,58,0.35), transparent 70%)',
                        filter: 'blur(6px)',
                      }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0.2, 0.55, 0] }}
                      transition={{ duration: MOVE_MS / 1000 }}
                    />
                  )}
                  <div
                    className="flex items-center gap-2 rounded-[8px] border border-[rgba(255,255,255,0.10)] bg-[#0B0D10]/88 px-2.5 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
                    title={file.name}
                  >
                    <FileGlyph ext={file.ext} color={file.color} />
                    <div className="min-w-0">
                      <p className="truncate font-mono text-[11px] leading-tight text-[#F4F1EA]/92">
                        {file.short}
                      </p>
                      <p className="mt-0.5 font-mono text-[9px] tracking-wide text-[#989DA6] uppercase">
                        {file.ext} · {file.size}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {phase === 'done' && (
            <motion.div
              className="absolute top-[40%] left-[min(36%,calc(100%-220px))] z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center"
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.12, duration: 0.45, ease: [0.22, 0.8, 0.2, 1] }}
            >
              <span
                className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(244,178,58,0.45)] bg-[rgba(244,178,58,0.10)]"
                aria-hidden="true"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F4B23A" strokeWidth="2.2">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <p className="text-[17px] font-semibold tracking-tight text-[#F4F1EA] md:text-[19px]">
                Downloads is clear
              </p>
              <p className="mt-1.5 font-mono text-[11px] tracking-[0.14em] text-[#F4B23A]/90 uppercase">
                All files in place
              </p>
            </motion.div>
          )}
        </div>

        {/* Folders */}
        <div
          className={
            mobile
              ? 'absolute right-3 bottom-3 left-3 z-20 grid grid-cols-2 gap-2'
              : 'absolute top-16 right-4 bottom-4 z-20 flex w-[200px] flex-col justify-between gap-2'
          }
        >
          {FOLDERS.map((folder) => {
            const active = pulseFolder === folder.id;
            const open = expanded === folder.id;
            const count = counts[folder.id];
            return (
              <div key={folder.id} className="relative">
                <button
                  type="button"
                  className="group flex w-full items-center gap-2.5 rounded-[9px] border px-3 py-2.5 text-left transition-colors"
                  style={{
                    borderColor: active || open ? 'rgba(244,178,58,0.55)' : 'rgba(255,255,255,0.10)',
                    background: active ? 'rgba(244,178,58,0.08)' : '#0B0D10',
                    transform: active ? 'scale(1.03)' : open ? 'scale(1.02)' : undefined,
                  }}
                  aria-expanded={open}
                  onClick={() => setExpanded(open ? null : folder.id)}
                >
                  <FolderShape active={active || open} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium text-[#F4F1EA]">{folder.id}</span>
                    <span className="mt-0.5 hidden font-mono text-[10px] text-[#989DA6] group-hover:block">
                      {folder.hint}
                    </span>
                  </span>
                  <span className="font-mono text-[12px] text-[#F4B23A] tabular-nums">{count}</span>
                </button>
                <AnimatePresence>
                  {open && (
                    <motion.div
                      className="absolute top-full right-0 left-0 z-30 mt-1 max-h-36 overflow-auto rounded-[8px] border border-[rgba(255,255,255,0.10)] bg-[#0B0D10] p-2 shadow-xl"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                    >
                      {folderContents[folder.id].length === 0 ? (
                        <p className="px-1 py-1 font-mono text-[10px] text-[#989DA6]">Empty</p>
                      ) : (
                        <ul className="space-y-1">
                          {folderContents[folder.id].map((f) => (
                            <li key={f.id} className="truncate font-mono text-[10px] text-[#F4F1EA]/85">
                              {f.name}
                            </li>
                          ))}
                        </ul>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Mascot — webm by default; flip USE_MASCOT_VIDEO to restore PNG motion */}
        <AnimatePresence>
          {showMascot &&
            (useVideoMascot ? (
              <motion.div
                key="mascot-video"
                className="pointer-events-none absolute z-20 select-none"
                style={{ left: mobile ? 8 : 20, bottom: mobile ? 124 : 16 }}
                initial={{ opacity: 0, x: -16, y: 10 }}
                animate={{
                  opacity: 1,
                  x: phase === 'done' ? (mobile ? 6 : 28) : 0,
                  y: phase === 'done' ? -4 : 0,
                }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
              >
                <video
                  ref={mascotVideoRef}
                  className="h-[72px] w-auto md:h-[96px]"
                  muted
                  playsInline
                  preload="metadata"
                  aria-hidden="true"
                >
                  <source src={MASCOT_VIDEO_SRC} type="video/webm" />
                </video>
              </motion.div>
            ) : (
              <motion.img
                key="mascot-image"
                src={MASCOT_IMAGE_SRC}
                alt=""
                width={168}
                height={126}
                className="pointer-events-none absolute z-20 h-[108px] w-auto select-none md:h-[132px]"
                style={{ left: mobile ? 8 : 20, bottom: mobile ? 120 : 20 }}
                variants={mascotVariants}
                initial="hidden"
                animate={phase === 'done' ? 'resting' : 'sweeping'}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
                draggable={false}
              />
            ))}
        </AnimatePresence>
      </div>

      {/* Rules */}
      <div className="mx-auto mt-5 flex max-w-[1180px] flex-wrap gap-2">
        {RULES.map((rule) => {
          const on = activeRule === rule.id;
          return (
            <div
              key={rule.id}
              className="rounded-md border px-3 py-1.5 font-mono text-[11px] transition-colors"
              style={{
                borderColor: on ? 'rgba(244,178,58,0.55)' : 'rgba(255,255,255,0.10)',
                background: on ? 'rgba(244,178,58,0.08)' : 'transparent',
                color: on ? '#F4B23A' : '#989DA6',
              }}
            >
              <span className="text-[#F4F1EA]/80">{rule.label}</span>
              <span className="mx-1.5 text-[#989DA6]/50">·</span>
              {rule.pattern}
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="mx-auto mt-6 flex max-w-[1180px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2.5">
          {phase !== 'done' ? (
            <button
              type="button"
              onClick={runOrganize}
              disabled={busy}
              className="rounded-[8px] bg-[#F4B23A] px-5 py-2.5 text-sm font-semibold text-[#151004] transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              Organize these files
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={undo}
                className="rounded-[8px] border border-[rgba(255,255,255,0.10)] px-4 py-2.5 text-sm text-[#F4F1EA] transition-colors hover:bg-[#12151A]"
              >
                Undo
              </button>
              <button
                type="button"
                onClick={runOrganize}
                className="rounded-[8px] bg-[#F4B23A] px-4 py-2.5 text-sm font-semibold text-[#151004] transition-opacity hover:opacity-90"
              >
                Run again
              </button>
              <a
                href="/docs/rules"
                className="rounded-[8px] border border-[rgba(255,255,255,0.10)] px-4 py-2.5 text-sm text-[#F4F1EA] transition-colors hover:bg-[#12151A]"
              >
                View rules
              </a>
            </>
          )}
        </div>

        {phase === 'done' && (
          <p className="font-mono text-[12px] text-[#989DA6]">
            {visibleFiles.length} files organized in {elapsed}s · 0 files uploaded
          </p>
        )}
      </div>
    </div>
  );
}
