import {act, renderHook} from '@testing-library/react';
import {StrictMode, useEffect} from 'react';
import {useLocalStorage} from '../useLocalStorage.js';
import {expect, it, vi} from 'vitest';

it('persists useLocalStorage updates and removes null without writing on mount', () => {
  localStorage.setItem('hook-state', JSON.stringify(2));
  const write = vi.spyOn(Storage.prototype, 'setItem');
  const {result, unmount} = renderHook(
    () => useLocalStorage<number | null>('hook-state', 0),
    {
      wrapper: StrictMode,
    },
  );
  expect(result.current[0]).toBe(2);
  expect(write).not.toHaveBeenCalled();
  act(() => result.current[1](value => value! + 1));
  expect(localStorage.getItem('hook-state')).toBe('3');
  act(() => result.current[1](null));
  expect(localStorage.getItem('hook-state')).toBeNull();
  unmount();
  write.mockRestore();
});

it('keeps useLocalStorage state usable when storage is unavailable', () => {
  const unavailable = vi
    .spyOn(globalThis, 'localStorage', 'get')
    .mockImplementation(() => {
      throw new Error('Storage unavailable');
    });
  try {
    const {result} = renderHook(() => useLocalStorage('hook-state', 'initial'));
    expect(result.current[0]).toBe('initial');
    act(() => result.current[1]('updated'));
    expect(result.current[0]).toBe('updated');
  } finally {
    unavailable.mockRestore();
  }
});

it('adopts the stored value of a new key instead of copying the previous key into it', () => {
  localStorage.setItem('first', JSON.stringify('one'));
  localStorage.setItem('second', JSON.stringify('two'));
  const {result, rerender} = renderHook(
    ({key}) => useLocalStorage<string | null>(key, 'fallback'),
    {initialProps: {key: 'first'}, wrapper: StrictMode},
  );
  expect(result.current[0]).toBe('one');
  rerender({key: 'second'});
  expect(result.current[0]).toBe('two');
  expect(localStorage.getItem('second')).toBe('"two"');
  rerender({key: 'missing'});
  expect(result.current[0]).toBe('fallback');
  expect(localStorage.getItem('missing')).toBeNull();
  act(() => result.current[1]('written'));
  expect(localStorage.getItem('missing')).toBe('"written"');
  expect(localStorage.getItem('first')).toBe('"one"');
});

it('does not expose or accept a previous key state after a key switch', async () => {
  localStorage.setItem('first', JSON.stringify('one'));
  localStorage.setItem('second', JSON.stringify('two'));
  const observed: string[] = [];
  let firstSetter: ReturnType<typeof useLocalStorage<string>>[1];
  const {rerender} = renderHook(
    ({key}) => {
      const state = useLocalStorage(key, 'fallback');
      useEffect(() => {
        observed.push(`${key}:${state[0]}`);
      }, [key, state]);
      if (key === 'first') firstSetter = state[1];
      return state;
    },
    {initialProps: {key: 'first'}, wrapper: StrictMode},
  );

  rerender({key: 'second'});
  await act(async () => {});
  act(() => firstSetter('stale'));

  expect(observed).not.toContain('second:one');
  expect(localStorage.getItem('second')).toBe('"two"');
});

it('does not revive a setter after returning to its key', () => {
  localStorage.setItem('first', JSON.stringify('one'));
  localStorage.setItem('second', JSON.stringify('two'));
  let firstSetter: ReturnType<typeof useLocalStorage<string>>[1] | undefined;
  const {rerender} = renderHook(
    ({key}) => {
      const state = useLocalStorage(key, 'fallback');
      if (key === 'first' && !firstSetter) firstSetter = state[1];
      return state;
    },
    {initialProps: {key: 'first'}, wrapper: StrictMode},
  );

  rerender({key: 'second'});
  rerender({key: 'first'});
  act(() => firstSetter?.('stale'));

  expect(localStorage.getItem('first')).toBe('"one"');
});
