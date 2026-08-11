'use client';

import { memo, useEffect, useRef, useState } from 'react';

const ICON_ROOT = 'https://qclay.design/lovable/loader/';
const ICON_INDEXES = ['01','02','03','04','05','06','07','08','09','10','11'];
const darkSrc = (n) => `${ICON_ROOT}icon-${n}.svg`;
const whiteSrc = (n) => `${ICON_ROOT}icon-w-${n}.svg`;

const M_POLY = '/polygons/m-polygon.svg';
const S_POLY = '/polygons/s-polygon.svg';
const C_POLY = '/polygons/c-polygon.svg';

const HEX_W = 141;
const HEX_H = 155;
const GAP = 8;
const STEP_X = HEX_W + GAP;            // 149
const STEP_Y = HEX_H * 0.78 + GAP;     // 128.9

const SRC_BY_VARIANT = { m: M_POLY, s: S_POLY, c: C_POLY };

function pickUniqueTriplet(prev) {
  const pool = [...ICON_INDEXES];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const pick = pool.slice(0, 3);
  if (prev) {
    for (let s = 0; s < 3; s++) {
      if (pick[s] === prev[s]) {
        const swap = pool.find((p) => !pick.includes(p));
        if (swap) pick[s] = swap;
      }
    }
  }
  return pick;
}

function ringOf(h) {
  if (h.variant === 'm') return 0;
  const cx = Math.round((h.x / STEP_X) * 2);
  const ry = Math.round(h.y / STEP_Y);
  return Math.max(Math.abs(ry), Math.ceil((Math.abs(cx) + Math.abs(ry)) / 2));
}

const HEXES = [
  // outer ring (z=0) — s-polygon
  { x: -2 * STEP_X, y: -2 * STEP_Y, variant: 's', z: 0 },
  { x: -1 * STEP_X, y: -2 * STEP_Y, variant: 's', z: 0 },
  { x: 0,            y: -2 * STEP_Y, variant: 's', z: 0 },
  { x:  1 * STEP_X, y: -2 * STEP_Y, variant: 's', z: 0 },
  { x:  2 * STEP_X, y: -2 * STEP_Y, variant: 's', z: 0 },
  { x: -2.5 * STEP_X, y: -STEP_Y, variant: 's', z: 0 },
  { x:  2.5 * STEP_X, y: -STEP_Y, variant: 's', z: 0 },
  { x: -3 * STEP_X, y: 0, variant: 's', z: 0 },
  { x:  3 * STEP_X, y: 0, variant: 's', z: 0 },
  { x: -2.5 * STEP_X, y: STEP_Y, variant: 's', z: 0 },
  { x:  2.5 * STEP_X, y: STEP_Y, variant: 's', z: 0 },
  { x: -2 * STEP_X, y:  2 * STEP_Y, variant: 's', z: 0 },
  { x: -1 * STEP_X, y:  2 * STEP_Y, variant: 's', z: 0 },
  { x: 0,            y:  2 * STEP_Y, variant: 's', z: 0 },
  { x:  1 * STEP_X, y:  2 * STEP_Y, variant: 's', z: 0 },
  { x:  2 * STEP_X, y:  2 * STEP_Y, variant: 's', z: 0 },

  // main row top (y = -STEP_Y)
  { x: -1.5 * STEP_X, y: -STEP_Y, variant: 's', z: 1 },
  { x: -0.5 * STEP_X, y: -STEP_Y, variant: 'c', z: 2 },
  { x:  0.5 * STEP_X, y: -STEP_Y, variant: 'c', z: 2 },
  { x:  1.5 * STEP_X, y: -STEP_Y, variant: 's', z: 1 },

  // main row center (y = 0)
  { x: -2 * STEP_X, y: 0, variant: 's', z: 1 },
  { x: -1 * STEP_X, y: 0, variant: 'c', z: 4, iconSet: 'dark',  slot: 0 },
  { x: 0,           y: 0, variant: 'm', z: 5, iconSet: 'white', slot: 1 },
  { x:  1 * STEP_X, y: 0, variant: 'c', z: 4, iconSet: 'dark',  slot: 2 },
  { x:  2 * STEP_X, y: 0, variant: 's', z: 1 },

  // main row bottom (y = +STEP_Y)
  { x: -1.5 * STEP_X, y: STEP_Y, variant: 's', z: 1 },
  { x: -0.5 * STEP_X, y: STEP_Y, variant: 'c', z: 2 },
  { x:  0.5 * STEP_X, y: STEP_Y, variant: 'c', z: 2 },
  { x:  1.5 * STEP_X, y: STEP_Y, variant: 's', z: 1 },
];

let _layerSeq = 0;

function HexIconSlot({ iconSet, layers, slot }) {
  return (
    <>
      {layers.map((layer) => {
        const src = iconSet === 'white'
          ? whiteSrc(layer.icons[slot])
          : darkSrc(layer.icons[slot]);
        const phaseClass =
          layer.status === 'incoming' ? 'hex-icon-in' :
          layer.status === 'outgoing' ? 'hex-icon-out' :
          'hex-icon-current';
        return (
          <img
            key={layer.id + '-' + slot}
            src={src}
            alt=""
            className={`hex-icon ${phaseClass}`}
            width={32}
            height={32}
            draggable={false}
          />
        );
      })}
    </>
  );
}

export default function HexScene() {
  const currentLayerRef = useRef(null);
  const layerIdRef = useRef(0);

  const [iconLayers, setIconLayers] = useState(() => {
    const first = { id: ++_layerSeq, icons: pickUniqueTriplet(), status: 'incoming' };
    currentLayerRef.current = { id: first.id, icons: first.icons };
    return [first];
  });

  // preload all 22 icon svg
  useEffect(() => {
    ICON_INDEXES.forEach((n) => {
      const a = new Image(); a.src = darkSrc(n);
      const b = new Image(); b.src = whiteSrc(n);
    });
  }, []);

  // icon rotation cycle
  useEffect(() => {
    let mounted = true;
    const timeouts = [];
    const FADE = 500;
    const HOLD = 2000;
    const schedule = (cb, delay) => {
      timeouts.push(window.setTimeout(() => { if (mounted) cb(); }, delay));
    };

    const beginTransition = () => {
      const previous = currentLayerRef.current;
      if (!previous) return;
      const nextIcons = pickUniqueTriplet(previous.icons);
      const nextId = ++_layerSeq;
      layerIdRef.current = nextId;
      currentLayerRef.current = { id: nextId, icons: nextIcons };

      setIconLayers([
        { id: previous.id, icons: previous.icons, status: 'outgoing' },
        { id: nextId, icons: nextIcons, status: 'incoming' },
      ]);

      schedule(() => {
        setIconLayers([{ id: nextId, icons: nextIcons, status: 'current' }]);
        schedule(beginTransition, HOLD);
      }, FADE);
    };

    schedule(() => {
      const current = currentLayerRef.current;
      if (!current) return;
      setIconLayers([{ id: current.id, icons: current.icons, status: 'current' }]);
      schedule(beginTransition, HOLD);
    }, FADE);

    return () => {
      mounted = false;
      timeouts.forEach(clearTimeout);
    };
  }, []);

  // uneven progress bar
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let mounted = true;
    let timeout;
    const tick = () => {
      if (!mounted) return;
      setProgress((p) => {
        if (p >= 100) return 0;
        const jump = Math.random() < 0.35
          ? Math.random() * 2 + 0.5
          : Math.random() * 16 + 3;
        return Math.min(100, p + jump);
      });
      timeout = window.setTimeout(tick, 200 + Math.random() * 700);
    };
    timeout = window.setTimeout(tick, 300);
    return () => { mounted = false; clearTimeout(timeout); };
  }, []);

  // breathing sine
  const [t, setT] = useState(0);
  const startRef = useRef(null);
  useEffect(() => {
    let raf = 0;
    const PERIOD = 3200;
    const tick = (now) => {
      if (startRef.current == null) startRef.current = now;
      const elapsed = (now - startRef.current) % PERIOD;
      setT(elapsed / PERIOD);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const wave = Math.sin(t * Math.PI * 2);
  const AMP = 0.10;
  const RING_DELAY = 0.08;

  const scaleForHex = (h) => {
    const r = ringOf(h);
    const w = Math.sin((t - r * RING_DELAY) * Math.PI * 2);
    return h.variant === 'm' ? 1 + AMP * wave : 1 - AMP * w;
  };

  const sceneW = 7 * STEP_X + HEX_W;      // 1184
  const sceneH = 5 * STEP_Y + HEX_H;      // 799.5

  return (
    <div className="loader-root">
      <div
        className="scene"
        style={{
          width: sceneW,
          height: sceneH,
          WebkitMaskImage:
            'radial-gradient(ellipse 45% 55% at center, #000 0%, rgba(0,0,0,0.85) 30%, rgba(0,0,0,0.35) 60%, transparent 90%)',
          maskImage:
            'radial-gradient(ellipse 45% 55% at center, #000 0%, rgba(0,0,0,0.85) 30%, rgba(0,0,0,0.35) 60%, transparent 90%)',
        }}
      >
        {HEXES.map((h, i) => {
          const s = scaleForHex(h);
          const tx = h.variant === 'm' ? 0 : h.x * s;
          const ty = h.variant === 'm' ? 0 : h.y * s;
          return (
            <div
              key={i}
              className="hex-wrap"
              style={{
                zIndex: h.z,
                transform: `translate(-50%, -50%) translate(${tx}px, ${ty}px)`,
              }}
            >
              <img
                src={SRC_BY_VARIANT[h.variant]}
                alt=""
                className="hex-tile"
                width={HEX_W}
                height={HEX_H}
                draggable={false}
                style={{
                  width: HEX_W,
                  height: 'auto',
                  transform: `scale(${s})`,
                  transformOrigin: 'center center',
                }}
              />
              {h.iconSet && h.slot != null ? (
                <div className="hex-icon-wrap">
                  <HexIconSlot iconSet={h.iconSet} layers={iconLayers} slot={h.slot} />
                </div>
              ) : null}
            </div>
          );
        })}

        {/* center glow */}
        <div className="glow" />
      </div>

      <div className="loading-block">
        <span className="loading-text">Loading Resources</span>
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: `${progress}%`, transition: 'width 0.35s ease-out' }}
          />
        </div>
      </div>
    </div>
  );
}
