import { useEffect, useRef } from 'react';

export function useOnce(fn: () => void) {
  const did = useRef(false);
  useEffect(() => { if (did.current) return; did.current = true; fn(); }, []);
}

export function useEventful<T>(value: T) { // stable ref to avoid effects re-firing
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

export function changed<T>(a: T, b: T) { // shallow compare
  if (Object.is(a, b)) return false;
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return true;
  const ka = Object.keys(a as any), kb = Object.keys(b as any);
  if (ka.length !== kb.length) return true;
  for (const k of ka) { if (!Object.is((a as any)[k], (b as any)[k])) return true; }
  return false;
}

export function useRenderCounter(name: string, limit = 60) {
  const r = useRef(0);
  r.current++;
  if (r.current > limit) console.warn('Render storm:', name, r.current);
}
