# Live Guide Player Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Live TV screen into a TV-style guide-player layout with embedded video, programme details, a time-grid EPG, highlighted active programme, click-to-play guide rows, click-active-to-fullscreen, and ESC back to embedded view.

**Architecture:** Keep the existing Electron/mpv player boundary and the existing catalogue/EPG store. Add focused renderer utilities and components for time-window EPG layout, then replace the Live TV right-side "programme cards" with a virtualized channel + timeline grid that shares selection state with playback.

**Tech Stack:** React 18, TypeScript, Zustand, lucide-react, Tailwind CSS, Vitest.

---

## Image Analysis

The reference screen has four important behaviours:

- Top-left video preview stays embedded while browsing.
- Top-right programme detail panel shows the active programme title, time range, progress, remaining time, description, favourite state, and channel name.
- Bottom guide is a horizontal time grid: channel rail on the left, time ruler across the top, programme blocks across each row, and a vertical "now" marker.
- The active playing channel/programme is visually obvious: cyan channel highlight plus a bright active programme block. Clicking another row tunes it. Clicking the active programme again enters fullscreen. ESC exits fullscreen.

## Scope

This plan only changes Live TV and EPG presentation/interaction. It does not change provider refresh, XMLTV parsing, mpv playback internals, movies, series, or installer configuration.

## File Structure

- Create `pages/liveGuide/timeWindow.ts`
  - Pure helpers for guide time windows, programme clipping, programme progress, and formatting.
- Create `pages/liveGuide/timeWindow.test.ts`
  - Unit tests for guide-window math and active programme selection.
- Create `pages/liveGuide/LiveNowPanel.tsx`
  - Top-right programme detail panel beside the embedded player.
- Create `pages/liveGuide/LiveGuideGrid.tsx`
  - Virtualized channel rows and horizontal EPG programme blocks.
- Modify `pages/LiveTv.tsx`
  - Replace the current right-side player/cards layout with the guide-player layout, keep guide time current, and wire interactions.
- Modify `components/Player.tsx`
  - Allow a compact embedded mode so the player can fill the preview box without duplicating channel metadata below it.
- Modify `components/player/PlayerOverlay.tsx`
  - Add a `compact?: boolean` prop to reduce overlay chrome in the embedded preview, while keeping full controls in fullscreen.

---

### Task 1: Guide Time Helpers

**Files:**
- Create: `pages/liveGuide/timeWindow.ts`
- Create: `pages/liveGuide/timeWindow.test.ts`

- [ ] **Step 1: Write failing tests**

Create `pages/liveGuide/timeWindow.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { EpgProgramme } from '../../types/app';
import { buildGuideWindow, findCurrentProgramme, getProgrammeBlock, getProgrammeProgress } from './timeWindow';

const programme = (id: string, startAt: string, endAt: string, title = id): EpgProgramme => ({
  id,
  channelId: 'live:1',
  startAt,
  endAt,
  title,
});

describe('live guide time window helpers', () => {
  it('starts on the previous half hour and spans two hours', () => {
    const window = buildGuideWindow(new Date('2026-06-29T03:18:00.000Z'));

    expect(window.start.toISOString()).toBe('2026-06-29T03:00:00.000Z');
    expect(window.end.toISOString()).toBe('2026-06-29T05:00:00.000Z');
    expect(window.ticks.map((tick) => tick.toISOString())).toEqual([
      '2026-06-29T03:00:00.000Z',
      '2026-06-29T03:30:00.000Z',
      '2026-06-29T04:00:00.000Z',
      '2026-06-29T04:30:00.000Z',
      '2026-06-29T05:00:00.000Z',
    ]);
  });

  it('clips programme blocks to the visible guide window', () => {
    const window = buildGuideWindow(new Date('2026-06-29T03:18:00.000Z'));
    const block = getProgrammeBlock(
      programme('f1', '2026-06-29T02:45:00.000Z', '2026-06-29T04:00:00.000Z'),
      window,
    );

    expect(block).toEqual({ leftPercent: 0, widthPercent: 50 });
  });

  it('returns null for programmes outside the guide window', () => {
    const window = buildGuideWindow(new Date('2026-06-29T03:18:00.000Z'));

    expect(getProgrammeBlock(programme('old', '2026-06-29T01:00:00.000Z', '2026-06-29T02:00:00.000Z'), window)).toBeNull();
    expect(getProgrammeBlock(programme('future', '2026-06-29T05:30:00.000Z', '2026-06-29T06:00:00.000Z'), window)).toBeNull();
  });

  it('finds the programme that is currently on air', () => {
    const now = new Date('2026-06-29T03:18:00.000Z');
    const current = findCurrentProgramme([
      programme('old', '2026-06-29T02:00:00.000Z', '2026-06-29T03:00:00.000Z'),
      programme('current', '2026-06-29T03:00:00.000Z', '2026-06-29T04:00:00.000Z'),
    ], now);

    expect(current?.id).toBe('current');
  });

  it('calculates current programme progress and remaining minutes', () => {
    const now = new Date('2026-06-29T03:42:00.000Z');
    const progress = getProgrammeProgress(programme('f1', '2026-06-29T03:00:00.000Z', '2026-06-29T04:00:00.000Z'), now);

    expect(progress.percent).toBe(70);
    expect(progress.remainingMinutes).toBe(18);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- pages/liveGuide/timeWindow.test.ts`

Expected: FAIL because `pages/liveGuide/timeWindow.ts` does not exist.

- [ ] **Step 3: Implement helpers**

Create `pages/liveGuide/timeWindow.ts`:

```ts
import type { EpgProgramme } from '../../types/app';

export type GuideWindow = {
  start: Date;
  end: Date;
  ticks: Date[];
  now: Date;
  durationMs: number;
};

export type ProgrammeBlock = {
  leftPercent: number;
  widthPercent: number;
};

const halfHourMs = 30 * 60 * 1000;
const guideDurationMs = 2 * 60 * 60 * 1000;

export function buildGuideWindow(now = new Date()): GuideWindow {
  const startMs = Math.floor(now.getTime() / halfHourMs) * halfHourMs;
  const start = new Date(startMs);
  const end = new Date(startMs + guideDurationMs);
  const ticks = Array.from({ length: 5 }, (_, index) => new Date(startMs + index * halfHourMs));

  return { start, end, ticks, now, durationMs: guideDurationMs };
}

export function getProgrammeBlock(programme: EpgProgramme, window: GuideWindow): ProgrammeBlock | null {
  const startMs = new Date(programme.startAt).getTime();
  const endMs = new Date(programme.endAt).getTime();
  const visibleStart = Math.max(startMs, window.start.getTime());
  const visibleEnd = Math.min(endMs, window.end.getTime());

  if (visibleEnd <= window.start.getTime() || visibleStart >= window.end.getTime() || visibleEnd <= visibleStart) {
    return null;
  }

  return {
    leftPercent: ((visibleStart - window.start.getTime()) / window.durationMs) * 100,
    widthPercent: ((visibleEnd - visibleStart) / window.durationMs) * 100,
  };
}

export function findCurrentProgramme(programmes: EpgProgramme[], now = new Date()): EpgProgramme | undefined {
  const nowMs = now.getTime();
  return programmes.find((programme) => {
    const startMs = new Date(programme.startAt).getTime();
    const endMs = new Date(programme.endAt).getTime();
    return startMs <= nowMs && endMs > nowMs;
  });
}

export function getProgrammeProgress(programme: EpgProgramme, now = new Date()) {
  const startMs = new Date(programme.startAt).getTime();
  const endMs = new Date(programme.endAt).getTime();
  const durationMs = Math.max(1, endMs - startMs);
  const elapsedMs = Math.min(durationMs, Math.max(0, now.getTime() - startMs));
  const remainingMs = Math.max(0, endMs - now.getTime());

  return {
    percent: Math.round((elapsedMs / durationMs) * 100),
    remainingMinutes: Math.ceil(remainingMs / 60000),
  };
}

export function formatGuideTime(value: Date | string): string {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatGuideDate(value: Date): string {
  return value.toLocaleDateString([], { weekday: 'short', day: '2-digit', month: 'short' });
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test -- pages/liveGuide/timeWindow.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add pages/liveGuide/timeWindow.ts pages/liveGuide/timeWindow.test.ts
git commit -m "feat: add live guide time helpers"
```

---

### Task 2: Programme Detail Panel

**Files:**
- Create: `pages/liveGuide/LiveNowPanel.tsx`

- [ ] **Step 1: Create detail panel component**

Create `pages/liveGuide/LiveNowPanel.tsx`:

```tsx
import { Heart } from 'lucide-react';
import type { EpgProgramme, LiveChannel } from '../../types/app';
import { formatGuideTime, getProgrammeProgress } from './timeWindow';

type LiveNowPanelProps = {
  channel: LiveChannel | null;
  programme?: EpgProgramme;
  isFavourite: boolean;
  now: Date;
  onToggleFavourite: () => void;
};

const LiveNowPanel: React.FC<LiveNowPanelProps> = ({ channel, programme, isFavourite, now, onToggleFavourite }) => {
  const progress = programme ? getProgrammeProgress(programme, now) : null;

  return (
    <section className="min-w-0 rounded-md border border-slate-800 bg-slate-900/85 p-5 text-white">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-2xl font-semibold">{programme?.title ?? channel?.name ?? 'Choose a channel'}</h2>
          {programme ? (
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-300">
              <span>{formatGuideTime(programme.startAt)} - {formatGuideTime(programme.endAt)}</span>
              <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-700">
                <span className="block h-full rounded-full bg-cyan-300" style={{ width: `${progress?.percent ?? 0}%` }} />
              </span>
              <span>{progress?.remainingMinutes ?? 0} min</span>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">{channel ? 'No current programme available.' : 'Select a channel to start browsing.'}</p>
          )}
        </div>
        <button className="icon-button shrink-0" title={isFavourite ? 'Remove favourite' : 'Add favourite'} onClick={onToggleFavourite} disabled={!channel}>
          <Heart className={`h-5 w-5 ${isFavourite ? 'fill-cyan-300 text-cyan-300' : 'text-slate-400'}`} />
        </button>
      </div>
      {programme?.description && <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-300">{programme.description}</p>}
      {channel && <p className="mt-5 text-right text-sm font-semibold text-slate-200">{channel.name}</p>}
    </section>
  );
};

export default LiveNowPanel;
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add pages/liveGuide/LiveNowPanel.tsx
git commit -m "feat: add live programme detail panel"
```

---

### Task 3: Timeline Guide Grid

**Files:**
- Create: `pages/liveGuide/LiveGuideGrid.tsx`

- [ ] **Step 1: Create grid component**

Create `pages/liveGuide/LiveGuideGrid.tsx`:

```tsx
import { Play } from 'lucide-react';
import type { EpgProgramme, LiveChannel } from '../../types/app';
import { formatGuideDate, formatGuideTime, getProgrammeBlock, type GuideWindow } from './timeWindow';

type LiveGuideGridProps = {
  channels: LiveChannel[];
  programmesByChannel: Map<string, EpgProgramme[]>;
  selectedChannelId?: string;
  playingChannelId?: string;
  activeProgrammeId?: string;
  guideWindow: GuideWindow;
  rowHeight: number;
  scrollTop: number;
  viewportHeight: number;
  onScrollTopChange: (value: number) => void;
  onTuneChannel: (channel: LiveChannel) => void;
  onProgrammeClick: (channel: LiveChannel, programme: EpgProgramme) => void;
};

const overscanRows = 5;
const channelRailWidth = 330;

const LiveGuideGrid: React.FC<LiveGuideGridProps> = ({
  channels,
  programmesByChannel,
  selectedChannelId,
  playingChannelId,
  activeProgrammeId,
  guideWindow,
  rowHeight,
  scrollTop,
  viewportHeight,
  onScrollTopChange,
  onTuneChannel,
  onProgrammeClick,
}) => {
  const visibleCount = Math.ceil((viewportHeight || 520) / rowHeight) + overscanRows * 2;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscanRows);
  const endIndex = Math.min(channels.length, startIndex + visibleCount);
  const visibleChannels = channels.slice(startIndex, endIndex);
  const nowLeft = ((guideWindow.now.getTime() - guideWindow.start.getTime()) / guideWindow.durationMs) * 100;

  return (
    <section className="min-h-0 overflow-hidden rounded-md border border-slate-800 bg-slate-950">
      <div className="grid border-b border-slate-800 bg-slate-900/95" style={{ gridTemplateColumns: `${channelRailWidth}px minmax(0, 1fr)` }}>
        <div className="px-4 py-3 text-sm font-semibold text-cyan-200">{formatGuideDate(guideWindow.now)}, {formatGuideTime(guideWindow.now)}</div>
        <div className="relative grid py-3 text-sm font-semibold text-slate-200" style={{ gridTemplateColumns: `repeat(${guideWindow.ticks.length - 1}, minmax(0, 1fr))` }}>
          {guideWindow.ticks.slice(0, -1).map((tick) => <div key={tick.toISOString()}>{formatGuideTime(tick)}</div>)}
        </div>
      </div>

      <div className="relative h-full overflow-y-auto" onScroll={(event) => onScrollTopChange(event.currentTarget.scrollTop)}>
        <div className="relative" style={{ height: channels.length * rowHeight }}>
          <div className="absolute inset-x-0 top-0" style={{ transform: `translateY(${startIndex * rowHeight}px)` }}>
            {visibleChannels.map((channel, offset) => {
              const rowIndex = startIndex + offset + 1;
              const programmes = programmesByChannel.get(channel.id) ?? [];
              const isPlayingChannel = channel.id === playingChannelId;
              const isSelectedChannel = channel.id === selectedChannelId;

              return (
                <div key={channel.id} className={`grid border-b border-slate-900/90 ${isSelectedChannel ? 'bg-cyan-950/20' : 'bg-slate-950'}`} style={{ gridTemplateColumns: `${channelRailWidth}px minmax(0, 1fr)`, height: rowHeight }}>
                  <button className="flex min-w-0 items-center gap-3 px-3 text-left hover:bg-slate-900" onClick={() => onTuneChannel(channel)}>
                    <span className={`w-7 text-center text-sm font-semibold ${isPlayingChannel ? 'text-cyan-300' : 'text-slate-400'}`}>{rowIndex}</span>
                    <img src={channel.logoUrl || ''} alt="" loading="lazy" className="h-9 w-9 rounded bg-slate-800 object-cover" />
                    <span className={`min-w-0 flex-1 truncate font-semibold ${isPlayingChannel ? 'text-cyan-200' : 'text-slate-100'}`}>{channel.name}</span>
                    {isPlayingChannel && <Play className="h-4 w-4 fill-cyan-300 text-cyan-300" />}
                  </button>

                  <div className="relative overflow-hidden">
                    {isPlayingChannel && <div className="absolute inset-y-1 left-0 right-0 rounded bg-cyan-500/5 ring-1 ring-inset ring-cyan-400/30" />}
                    {nowLeft >= 0 && nowLeft <= 100 && (
                      <div className="pointer-events-none absolute top-0 bottom-0 z-10 w-px bg-cyan-300" style={{ left: `${nowLeft}%` }}>
                        <span className="absolute -top-1 -left-1.5 h-3 w-3 rounded-full bg-cyan-300" />
                      </div>
                    )}
                    {programmes.map((programme) => {
                      const block = getProgrammeBlock(programme, guideWindow);
                      if (!block) return null;
                      const active = programme.id === activeProgrammeId && isPlayingChannel;

                      return (
                        <button
                          key={programme.id}
                          className={`absolute top-1 bottom-1 min-w-16 overflow-hidden rounded-md border px-3 text-left text-sm font-semibold transition hover:border-cyan-300 ${active ? 'border-white bg-white text-slate-950 shadow-lg' : 'border-slate-700 bg-slate-800/80 text-slate-100'}`}
                          style={{ left: `${block.leftPercent}%`, width: `${block.widthPercent}%` }}
                          onClick={() => onProgrammeClick(channel, programme)}
                          title={programme.title}
                        >
                          <span className="block truncate">{programme.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default LiveGuideGrid;
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add pages/liveGuide/LiveGuideGrid.tsx
git commit -m "feat: add live epg timeline grid"
```

---

### Task 4: Compact Player Overlay

**Files:**
- Modify: `components/Player.tsx`
- Modify: `components/player/PlayerOverlay.tsx`

- [ ] **Step 1: Add compact player props**

In `components/Player.tsx`, change the props type and component signature:

```tsx
type PlayerProps = {
  request: PlaybackRequest | null;
  compact?: boolean;
};

const Player: React.FC<PlayerProps> = ({ request, compact = false }) => {
```

Then replace:

```tsx
<PlayerOverlay />
```

with:

```tsx
<PlayerOverlay compact={compact && !isFullscreen} />
```

- [ ] **Step 2: Add compact overlay prop**

In `components/player/PlayerOverlay.tsx`, change the component signature:

```tsx
type PlayerOverlayProps = {
  compact?: boolean;
};

const PlayerOverlay: React.FC<PlayerOverlayProps> = ({ compact = false }) => {
```

Change the root class:

```tsx
<div className={`${compact ? 'bg-slate-950/85 p-3' : 'bg-slate-950/95 p-4'} border-t border-slate-800 text-white`}>
```

Change the title line:

```tsx
<div className={`${compact ? 'text-sm' : 'text-lg'} font-semibold truncate`}>{state.title}</div>
```

Wrap audio/subtitle selectors so they stay hidden in compact embedded mode:

```tsx
{!compact && (state.audioTracks.length > 0 || state.subtitleTracks.length > 0) && (
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/Player.tsx components/player/PlayerOverlay.tsx
git commit -m "feat: support compact embedded player controls"
```

---

### Task 5: Wire Live TV To The Guide-Player Layout

**Files:**
- Modify: `pages/LiveTv.tsx`

- [ ] **Step 1: Update imports**

Replace the current import block in `pages/LiveTv.tsx` with:

```tsx
import { Heart, Play } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import Player from '../components/Player';
import { usePlayerStore } from '../store/playerStore';
import { useAppStore } from '../store/useAppStore';
import type { EpgProgramme, LiveChannel } from '../types/app';
import LiveGuideGrid from './liveGuide/LiveGuideGrid';
import LiveNowPanel from './liveGuide/LiveNowPanel';
import { buildGuideWindow, findCurrentProgramme } from './liveGuide/timeWindow';
```

- [ ] **Step 2: Add EPG index and guide state**

Inside `LiveTv`, after `favouriteIds`, add:

```tsx
const [guideScrollTop, setGuideScrollTop] = useState(0);
const [guideHeight, setGuideHeight] = useState(0);
const [guideNow, setGuideNow] = useState(() => new Date());
const guideRef = useRef<HTMLDivElement | null>(null);
const guideWindow = useMemo(() => buildGuideWindow(guideNow), [guideNow]);
const programmesByChannel = useMemo(() => {
  const index = new Map<string, EpgProgramme[]>();
  for (const programme of epg) {
    const items = index.get(programme.channelId) ?? [];
    items.push(programme);
    index.set(programme.channelId, items);
  }
  for (const items of index.values()) {
    items.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }
  return index;
}, [epg]);
```

- [ ] **Step 3: Keep guide time current**

After the existing left list resize `useEffect`, add:

```tsx
useEffect(() => {
  const timer = window.setInterval(() => setGuideNow(new Date()), 30000);
  return () => window.clearInterval(timer);
}, []);
```

- [ ] **Step 4: Replace schedule derivation**

Replace the existing `schedule`, `now`, `currentProgramme`, `guideProgrammes`, and `upcomingProgrammes` derivation with:

```tsx
const selectedSchedule = useMemo(() => selected ? programmesByChannel.get(selected.id) ?? [] : [], [programmesByChannel, selected]);
const currentProgramme = findCurrentProgramme(selectedSchedule, guideWindow.now);
```

- [ ] **Step 5: Add guide resize observer**

After the existing left list resize `useEffect`, add:

```tsx
useEffect(() => {
  const guide = guideRef.current;
  if (!guide) return;

  const updateHeight = () => setGuideHeight(guide.clientHeight);
  updateHeight();
  const observer = new ResizeObserver(updateHeight);
  observer.observe(guide);
  return () => observer.disconnect();
}, []);
```

- [ ] **Step 6: Add click handlers**

After `play(channel)`, add:

```tsx
function handleProgrammeClick(channel: LiveChannel, programme: EpgProgramme) {
  const isActive = currentRequest?.kind === 'live' && currentRequest.itemId === channel.id && currentProgramme?.id === programme.id;
  if (isActive) {
    void window.titon.setWindowFullscreen(true).then((fullscreen) => {
      usePlayerStore.setState((current) => ({ state: { ...current.state, fullscreen } }));
    });
    return;
  }
  play(channel);
}

function toggleSelectedFavourite() {
  if (!selected) return;
  void toggleFavourite({ kind: 'live', itemId: selected.id, createdAt: new Date().toISOString() });
}
```

- [ ] **Step 7: Replace right-side JSX**

Replace the current `<section className="min-h-0 bg-slate-950 p-4 flex flex-col gap-4 overflow-hidden">...</section>` with:

```tsx
<section className="min-h-0 bg-slate-950 p-4 flex flex-col gap-4 overflow-hidden">
  <div className="grid min-h-[18rem] grid-cols-[minmax(24rem,42rem)_minmax(0,1fr)] gap-4">
    <div className="overflow-hidden rounded-md border border-slate-800 bg-black">
      <div className="aspect-video h-full max-h-[34vh] min-h-[18rem]">
        {fullscreen ? <div className="h-full w-full bg-black" /> : <Player request={currentRequest} compact />}
      </div>
    </div>
    <LiveNowPanel
      channel={selected}
      programme={currentProgramme}
      isFavourite={Boolean(selected && favouriteIds.has(selected.id))}
      now={guideWindow.now}
      onToggleFavourite={toggleSelectedFavourite}
    />
  </div>

  <div ref={guideRef} className="min-h-0 flex-1">
    <LiveGuideGrid
      channels={filtered}
      programmesByChannel={programmesByChannel}
      selectedChannelId={selected?.id}
      playingChannelId={currentRequest?.kind === 'live' ? currentRequest.itemId : undefined}
      activeProgrammeId={currentProgramme?.id}
      guideWindow={guideWindow}
      rowHeight={70}
      scrollTop={guideScrollTop}
      viewportHeight={guideHeight}
      onScrollTopChange={setGuideScrollTop}
      onTuneChannel={play}
      onProgrammeClick={handleProgrammeClick}
    />
  </div>
</section>
```

- [ ] **Step 8: Reset guide scroll on category/search changes**

In the existing `useEffect` that resets the left list scroll, add:

```tsx
setGuideScrollTop(0);
```

- [ ] **Step 9: Run typecheck**

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add pages/LiveTv.tsx
git commit -m "feat: wire live tv guide player layout"
```

---

### Task 6: Full Verification And Package

**Files:**
- Modify only if verification finds a specific defect.

- [ ] **Step 1: Run focused tests**

Run: `npm test -- pages/liveGuide/timeWindow.test.ts tests/xtream/epg.test.ts tests/player/playerService.test.ts`

Expected: PASS.

- [ ] **Step 2: Run full verification**

Run: `npm run build`

Expected: PASS for typecheck, tests, renderer build, and Electron build.

- [ ] **Step 3: Build Windows installer**

Run: `npm run build:win`

Expected: PASS and a new installer in `release`.

- [ ] **Step 4: Manual check in installed app**

Install the generated setup from `F:\projects\titon-iptv-player\release`.

Expected manual results:
- Live TV opens with embedded player top-left, programme detail top-right, and timeline EPG below.
- Left channel list still scrolls independently.
- Category changes do not freeze the mouse for more than a brief moment.
- Clicking a channel tunes immediately.
- Clicking a non-active programme row tunes that channel.
- Active playing channel is highlighted in the channel rail.
- Active current programme is highlighted as a bright block.
- Clicking the active current programme enters fullscreen.
- ESC exits fullscreen back to the embedded guide layout.
- Player controls hide in fullscreen after idle and reappear on mouse movement.
- EPG remains visible after app restart when cached data exists.

- [ ] **Step 5: Commit verification fixes or version bump**

If no code fixes are needed, bump `package.json` from `1.0.13` to `1.0.14` and commit:

```bash
git add package.json package-lock.json
git commit -m "chore: release live guide layout"
```

If code fixes were needed, commit them with a focused message before the version bump.

---

## Self-Review

- Spec coverage: This plan preserves mpv native playback and focuses on Live TV/EPG layout. Movies, Series, provider refresh, and EPG parsing are intentionally unchanged.
- Image coverage: Video preview, programme detail, channel rail, time ruler, now marker, active EPG highlight, click-to-play, active-click fullscreen, and ESC return are covered.
- Placeholder scan: No placeholder steps are present.
- Type consistency: The plan uses existing `LiveChannel`, `EpgProgramme`, `PlaybackRequest`, `PlayerState`, and store APIs.
