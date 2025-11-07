let inflight = 0
const subs = new Set<(n: number) => void>()

export function onInflight(fn: (n: number) => void) {
  subs.add(fn);
  // FIX: The cleanup function for useEffect must return void. Set.delete() returns a boolean. Wrapping it in curly braces makes the arrow function return void.
  return () => { subs.delete(fn) };
}

function bump(d: number) {
  inflight += d;
  subs.forEach(s => s(inflight));
}

export class TimeoutError extends Error {
  constructor(message = 'Request timed out') {
    super(message);
    this.name = 'TimeoutError';
  }
}

export async function withTimeout<T>(fn: () => Promise<T>, ms: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`timeout:${ms}`)), ms);
  });

  bump(+1);
  try {
    const result = await Promise.race([fn(), timeoutPromise]);
    clearTimeout(timeoutId);
    return result;
  } catch (e) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    throw e;
  } finally {
    bump(-1);
  }
}


/** Stopwatch helper: returns { stop, subscribe } for elapsed ms */
export function createStopwatch() {
  let start = Date.now()
  let int: any = null
  let ms = 0
  const listeners = new Set<(ms:number)=>void>()
  const tick = () => { ms = Date.now() - start; listeners.forEach(l=>l(ms)) }
  int = setInterval(tick, 250)
  return {
    subscribe(fn:(ms:number)=>void){ listeners.add(fn); fn(ms); return ()=>listeners.delete(fn) },
    stop(){ if(int){ clearInterval(int); int=null } return ms }
  }
}
