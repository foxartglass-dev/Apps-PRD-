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

export async function withTimeout<T>(fn: () => Promise<T>, ms = 30000): Promise<T> {
  const timeoutPromise = new Promise<T>((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      reject(new TimeoutError(`Request timed out after ${ms}ms`));
    }, ms);
  });

  try {
    bump(+1);
    return await Promise.race([fn(), timeoutPromise]);
  } finally {
    bump(-1);
  }
}
