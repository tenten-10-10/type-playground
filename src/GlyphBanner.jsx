import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { parse } from 'opentype.js';

const WIDTH = 1440;
const HEIGHT = 304;
const FONT_SIZE = 132;
const LEFT = 43;
const BASELINE = 215;
const MAX_WIDTH = 1340;
let fontPromise;

async function loadFonts() {
  if (!fontPromise) {
    const base = import.meta.env.BASE_URL || '/';
    fontPromise = Promise.all(['Arimo.ttf', 'NotoSansJP.ttf'].map(async (name) => {
      const response = await fetch(`${base}fonts/${name}`);
      if (!response.ok) throw new Error(`フォントを読み込めませんでした（${name}）。ページを再読み込みしてください。`);
      return parse(await response.arrayBuffer());
    })).catch((error) => {
      fontPromise = undefined;
      throw error;
    });
  }
  return fontPromise;
}

function selectFont(character, fonts) {
  return fonts[0].charToGlyphIndex(character) !== 0 ? fonts[0] : fonts[1];
}

function colorValue(value, fallback = '#ffffff') {
  return typeof value === 'string' && /^(?:#[\da-f]{3,4}|#[\da-f]{6}|#[\da-f]{8})$/i.test(value) ? value : fallback;
}

function makeLayout(parts, caption, showBrackets, fonts) {
  if (!fonts) return { glyphs: [], captionGlyphs: [], selectable: [] };
  let remaining = 120;
  const foreground = colorValue(parts[0]?.color);
  const sections = parts.map((part) => {
    const text = Array.from(String(part.text || '')).slice(0, remaining).join('');
    remaining -= Array.from(text).length;
    return { text, color: colorValue(part.color) };
  }).filter((part) => part.text);

  function appendRun(glyphs, text, color, start, baseline, size, decorative = false) {
    let x = start;
    const characters = Array.from(text);
    for (let i = 0; i < characters.length; i += 1) {
      const character = characters[i];
      const font = selectFont(character, fonts);
      const glyph = font.charToGlyph(character);
      const nextFont = characters[i + 1] ? selectFont(characters[i + 1], fonts) : null;
      const nextGlyph = nextFont === font ? font.charToGlyph(characters[i + 1]) : null;
      const path = glyph.getPath(x, baseline, size, {}, font);
      const advance = (glyph.advanceWidth || font.unitsPerEm) * size / font.unitsPerEm;
      const box = path.getBoundingBox();
      glyphs.push({ character, color, path, box, x, advance, decorative, anchors: getAnchors(path.commands) });
      x += advance;
      if (nextGlyph) x += font.getKerningValue(glyph, nextGlyph) * size / font.unitsPerEm;
    }
    return x;
  }

  const buildMain = (size, gap) => {
    const glyphs = [];
    let x = LEFT;
    sections.forEach((part, index) => {
      if (index) x += gap;
      const bracketed = showBrackets && index === sections.length - 1;
      const bracketBaseline = BASELINE - 10 * size / FONT_SIZE;
      if (bracketed) x = appendRun(glyphs, '[', foreground, x, bracketBaseline, size, true);
      x = appendRun(glyphs, part.text, part.color, x, BASELINE, size);
      if (bracketed) x = appendRun(glyphs, ']', foreground, x, bracketBaseline, size, true);
    });
    return { glyphs, width: x - LEFT };
  };

  let main = buildMain(FONT_SIZE, 28);
  if (main.width > MAX_WIDTH) {
    const scale = MAX_WIDTH / main.width;
    main = buildMain(FONT_SIZE * scale, 28 * scale);
  }
  let captionGlyphs = [];
  const captionText = Array.from(String(caption || '')).slice(0, 100).join('');
  const captionEnd = appendRun(captionGlyphs, captionText, foreground, 50, 68, 22);
  if (captionEnd - 50 > MAX_WIDTH) {
    captionGlyphs = [];
    appendRun(captionGlyphs, captionText, foreground, 50, 68, 22 * MAX_WIDTH / (captionEnd - 50));
  }
  const selectable = main.glyphs.flatMap((glyph, index) => !glyph.decorative && glyph.path.commands.length ? [index] : []);
  return { glyphs: main.glyphs, captionGlyphs, selectable };
}

function getAnchors(commands) {
  const unique = new Map();
  for (const command of commands) {
    if (Number.isFinite(command.x) && Number.isFinite(command.y)) {
      unique.set(`${command.x.toFixed(3)},${command.y.toFixed(3)}`, { x: command.x, y: command.y });
    }
  }
  return [...unique.values()];
}

function tracePath(context, commands) {
  context.beginPath();
  for (const command of commands) {
    if (command.type === 'M') context.moveTo(command.x, command.y);
    else if (command.type === 'L') context.lineTo(command.x, command.y);
    else if (command.type === 'Q') context.quadraticCurveTo(command.x1, command.y1, command.x, command.y);
    else if (command.type === 'C') context.bezierCurveTo(command.x1, command.y1, command.x2, command.y2, command.x, command.y);
    else if (command.type === 'Z') context.closePath();
  }
}

function drawScene(context, layout, levels, settings, width, height) {
  const { background, effect, intensity } = settings;
  context.setTransform(width / WIDTH, 0, 0, height / HEIGHT, 0, 0);
  context.globalAlpha = 1;
  context.fillStyle = colorValue(background, '#000000');
  context.fillRect(0, 0, WIDTH, HEIGHT);
  for (const glyph of layout.captionGlyphs) {
    tracePath(context, glyph.path.commands);
    context.fillStyle = glyph.color;
    context.fill();
  }
  layout.glyphs.forEach((glyph, index) => {
    const level = effect === 'fill' ? 0 : (levels[index] || 0);
    tracePath(context, glyph.path.commands);
    context.fillStyle = glyph.color;
    context.globalAlpha = 1 - level;
    context.fill();
    if (level > 0.001) {
      context.globalAlpha = level;
      context.strokeStyle = glyph.color;
      context.lineWidth = 1.3;
      context.lineJoin = 'round';
      context.stroke();
      if (effect === 'anchors') {
        const radius = 3.5 * Math.max(0.35, Math.min(2, Number(intensity) || 1));
        context.beginPath();
        for (const anchor of glyph.anchors) {
          context.moveTo(anchor.x + radius, anchor.y);
          context.arc(anchor.x, anchor.y, radius, 0, Math.PI * 2);
        }
        context.fill();
      }
    }
  });
  context.globalAlpha = 1;
}

const escapeXml = (value) => String(value).replace(/[<>&"']/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[character]));
const number = (value) => Number(value.toFixed(3));

function sceneSvg(layout, levels, settings, label) {
  const fragments = [`<svg xmlns="http://www.w3.org/2000/svg" width="2880" height="608" viewBox="0 0 1440 304" role="img"><title>${escapeXml(label)}</title><rect width="1440" height="304" fill="${colorValue(settings.background, '#000000')}"/>`];
  for (const glyph of layout.captionGlyphs) {
    fragments.push(`<path d="${glyph.path.toPathData({ decimalPlaces: 3, flipY: false })}" fill="${glyph.color}"/>`);
  }
  layout.glyphs.forEach((glyph, index) => {
    const level = settings.effect === 'fill' ? 0 : (levels[index] || 0);
    const pathData = glyph.path.toPathData({ decimalPlaces: 3, flipY: false });
    fragments.push(`<path d="${pathData}" fill="${glyph.color}" fill-opacity="${number(1 - level)}"/>`);
    if (level > 0.001) {
      fragments.push(`<g opacity="${number(level)}" fill="${glyph.color}"><path d="${pathData}" fill="none" stroke="${glyph.color}" stroke-width="1.3" stroke-linejoin="round"/>`);
      if (settings.effect === 'anchors') {
        const radius = 3.5 * Math.max(0.35, Math.min(2, Number(settings.intensity) || 1));
        glyph.anchors.forEach((point) => fragments.push(`<circle cx="${number(point.x)}" cy="${number(point.y)}" r="${number(radius)}"/>`));
      }
      fragments.push('</g>');
    }
  });
  fragments.push('</svg>');
  return fragments.join('');
}

const GlyphBanner = forwardRef(function GlyphBanner({
  parts = [],
  caption = '',
  background = '#000000',
  effect = 'anchors',
  showBrackets = true,
  intensity = 1,
  playing = false,
  onReady,
  onError,
}, ref) {
  const canvasRef = useRef(null);
  const [fonts, setFonts] = useState(null);
  const [error, setError] = useState('');
  const callbacks = useRef({ onReady, onError });
  callbacks.current = { onReady, onError };
  const readyNotified = useRef(false);
  const partsKey = JSON.stringify(parts);
  const layout = useMemo(() => makeLayout(parts, caption, showBrackets, fonts), [partsKey, caption, showBrackets, fonts]);
  const scene = useRef({ layout, background, effect, intensity, playing });
  scene.current = { layout, background, effect, intensity, playing };
  const animation = useRef({ levels: [], active: null, frame: null, last: 0, playStart: 0 });
  const requestDraw = useRef(() => {});
  const touchReleaseTimer = useRef(null);
  const label = [caption, ...parts.map((part) => part.text)].filter(Boolean).join(' / ');

  useEffect(() => {
    let cancelled = false;
    loadFonts().then((loaded) => {
      if (cancelled) return;
      setFonts(loaded);
      if (!readyNotified.current) {
        readyNotified.current = true;
        callbacks.current.onReady?.();
      }
    }).catch((reason) => {
      if (cancelled) return;
      const message = reason?.message || 'フォントを読み込めませんでした。ページを再読み込みしてください。';
      setError(message);
      callbacks.current.onError?.(message);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const context = canvas.getContext('2d');
    if (!context) return undefined;
    const state = animation.current;

    const tick = (timestamp) => {
      state.frame = null;
      const settings = scene.current;
      const dt = Math.min(64, Math.max(0, timestamp - (state.last || timestamp)));
      state.last = timestamp;
      let active = state.active;
      if (settings.playing && settings.layout.selectable.length) {
        const step = Math.floor((timestamp - state.playStart) / 460);
        active = settings.layout.selectable[step % settings.layout.selectable.length];
      }
      let moving = false;
      settings.layout.glyphs.forEach((glyph, index) => {
        const target = index === active && settings.effect !== 'fill' ? 1 : 0;
        const previous = state.levels[index] || 0;
        const step = dt / (target ? 180 : 450);
        const next = target ? Math.min(1, previous + step) : Math.max(0, previous - step);
        state.levels[index] = next;
        if (next !== target) moving = true;
      });
      drawScene(context, settings.layout, state.levels, settings, canvas.width, canvas.height);
      if (moving || settings.playing) state.frame = requestAnimationFrame(tick);
    };
    requestDraw.current = () => {
      if (state.frame === null) {
        state.last = performance.now();
        state.frame = requestAnimationFrame(tick);
      }
    };
    const resize = () => {
      const ratio = Math.max(2, canvas.getBoundingClientRect().width * (window.devicePixelRatio || 1) / WIDTH);
      canvas.width = Math.round(WIDTH * ratio);
      canvas.height = Math.round(HEIGHT * ratio);
      requestDraw.current();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    return () => {
      observer.disconnect();
      if (state.frame !== null) cancelAnimationFrame(state.frame);
      if (touchReleaseTimer.current !== null) clearTimeout(touchReleaseTimer.current);
      touchReleaseTimer.current = null;
      state.frame = null;
      requestDraw.current = () => {};
    };
  }, []);

  useEffect(() => {
    animation.current.levels = layout.glyphs.map(() => 0);
    animation.current.active = null;
    requestDraw.current();
  }, [layout]);

  useEffect(() => {
    animation.current.playStart = performance.now();
    requestDraw.current();
  }, [playing]);

  useEffect(() => { requestDraw.current(); }, [background, effect, intensity]);

  useImperativeHandle(ref, () => ({
    exportPng() {
      if (!fonts) return Promise.reject(new Error('フォントの読み込み完了後に保存できます。'));
      const canvas = document.createElement('canvas');
      canvas.width = WIDTH * 2;
      canvas.height = HEIGHT * 2;
      drawScene(canvas.getContext('2d'), scene.current.layout, animation.current.levels, scene.current, canvas.width, canvas.height);
      return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('PNGを作成できませんでした。')), 'image/png'));
    },
    exportSvg() {
      if (!fonts) throw new Error('フォントの読み込み完了後に保存できます。');
      return sceneSvg(scene.current.layout, animation.current.levels, scene.current, label);
    },
  }), [fonts, label]);

  const select = (index) => {
    animation.current.active = index;
    requestDraw.current();
  };

  const clearTouchRelease = () => {
    if (touchReleaseTimer.current !== null) clearTimeout(touchReleaseTimer.current);
    touchReleaseTimer.current = null;
  };

  const pointerMove = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) * WIDTH / bounds.width;
    const y = (event.clientY - bounds.top) * HEIGHT / bounds.height;
    const index = layout.glyphs.findIndex((glyph) => !glyph.decorative && glyph.path.commands.length && x >= glyph.x - 3 && x <= glyph.x + glyph.advance + 3 && y >= glyph.box.y1 - 10 && y <= glyph.box.y2 + 12);
    select(index >= 0 ? index : null);
  };

  const keyDown = (event) => {
    const choices = layout.selectable;
    if (!choices.length) return;
    const current = choices.indexOf(animation.current.active);
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      select(choices[(current + 1) % choices.length]);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      select(choices[(current <= 0 ? choices.length : current) - 1]);
    } else if (event.key === 'Home') {
      event.preventDefault();
      select(choices[0]);
    } else if (event.key === 'End') {
      event.preventDefault();
      select(choices[choices.length - 1]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      select(null);
    }
  };

  return <div style={{ position: 'relative', width: '100%', background: colorValue(background, '#000000'), aspectRatio: `${WIDTH} / ${HEIGHT}` }}>
    <canvas
      ref={canvasRef}
      width={WIDTH * 2}
      height={HEIGHT * 2}
      tabIndex={0}
      role="img"
      aria-label={`${label || '文字プレビュー'}。文字にポインターを重ねるか、矢印キーで文字を選択してください。Escapeで解除できます。`}
      aria-busy={!fonts && !error}
      onPointerMove={pointerMove}
      onPointerDown={(event) => { clearTouchRelease(); pointerMove(event); }}
      onPointerLeave={(event) => { if (event.pointerType === 'mouse') select(null); }}
      onPointerCancel={() => { clearTouchRelease(); select(null); }}
      onPointerUp={(event) => {
        if (event.pointerType !== 'mouse') {
          clearTouchRelease();
          touchReleaseTimer.current = setTimeout(() => {
            touchReleaseTimer.current = null;
            select(null);
          }, 600);
        }
      }}
      onKeyDown={keyDown}
      onBlur={() => { clearTouchRelease(); select(null); }}
      style={{ display: 'block', width: '100%', height: '100%', cursor: effect === 'fill' ? 'default' : 'pointer', touchAction: 'pan-y' }}
    />
    {!fonts && <div role={error ? 'alert' : 'status'} style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 24, color: '#ffffff', fontSize: 14, textAlign: 'center', pointerEvents: 'none' }}>{error || 'フォントを読み込んでいます…'}</div>}
  </div>;
});

export default GlyphBanner;
