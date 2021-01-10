import { DependencyList, useCallback, useEffect, useState } from 'react';
import { debounce as _debounce } from 'lodash';

/**
 * Debounced useMemo()
 */
export default function useDebouncedMemo<T>(
  factory: () => T,
  deps: DependencyList | undefined,
  debounce: number
): T {
  const [state, setState] = useState(factory());

  const debouncedSetState = useCallback(_debounce(setState, debounce), []);

  useEffect(() => {
    debouncedSetState(factory());
  }, deps);

  return state;
}
