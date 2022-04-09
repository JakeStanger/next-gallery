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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSetState = useCallback(_debounce(setState, debounce), []);

  useEffect(() => {
    debouncedSetState(factory());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
