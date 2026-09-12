import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';

function read<T>(key: string, defaultState: T): T {
  try {
    const stored = globalThis.localStorage?.getItem(key);
    return stored ? (JSON.parse(stored) as T) : defaultState;
  } catch {
    return defaultState;
  }
}

/** React state persisted as JSON; null removes the stored value. */
export function useLocalStorage<T>(
  key: string,
  defaultState: T,
): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState(() => ({key, value: read(key, defaultState)}));
  const initial = useRef<{key: string; value: T} | null>({
    key: state.key,
    value: state.value,
  });
  if (state.key !== key) {
    const value = read(key, defaultState);
    initial.current = {key, value};
    setState({key, value});
  }
  const {value} = state;
  const setValue = useCallback<Dispatch<SetStateAction<T>>>(
    next =>
      setState(current => {
        if (current.key !== key) return current;
        return {
          key,
          value:
            typeof next === 'function'
              ? (next as (value: T) => T)(current.value)
              : next,
        };
      }),
    [key],
  );
  useEffect(() => {
    // Mounting (including StrictMode) must not overwrite storage with a fallback.
    if (initial.current?.key === key && Object.is(initial.current.value, value))
      return;
    initial.current = null;
    try {
      if (value === null) globalThis.localStorage?.removeItem(key);
      else globalThis.localStorage?.setItem(key, JSON.stringify(value));
    } catch {
      // Unavailable or full storage must not prevent local state updates.
    }
  }, [key, value]);
  return [value, setValue];
}
