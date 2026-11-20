import React, {
  CSSProperties,
  PropsWithChildren,
  useEffect,
  useLayoutEffect,
  useRef,
} from 'react';
import type MasonryLayout from 'masonry-layout';

interface IMasonryProps {
  className?: string;
  style?: CSSProperties;
  options?: MasonryLayout.Options;
  onLayoutComplete?: () => void;
}

// useLayoutEffect warns during SSR; Masonry only ever runs in the browser.
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Minimal React wrapper around `masonry-layout`.
 *
 * Replaces `react-masonry-component`, which is built on `create-react-class`
 * and does not support React 18+. Card dimensions are always known up-front
 * (they are derived from the stored image width/height), so a relayout after
 * each render is all that is required.
 */
const Masonry: React.FC<PropsWithChildren<IMasonryProps>> = ({
  className,
  style,
  options,
  onLayoutComplete,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const masonryRef = useRef<MasonryLayout | null>(null);
  const onLayoutCompleteRef = useRef(onLayoutComplete);

  useEffect(() => {
    onLayoutCompleteRef.current = onLayoutComplete;
  }, [onLayoutComplete]);

  // create/destroy instance
  useEffect(() => {
    let cancelled = false;

    // masonry-layout touches `window` at import time, so load it client-side only
    import('masonry-layout').then(({ default: MasonryLayout }) => {
      if (cancelled || !containerRef.current) return;

      const masonry = new MasonryLayout(containerRef.current, {
        ...options,
        initLayout: false,
      });

      masonry.on?.('layoutComplete', () => onLayoutCompleteRef.current?.());
      masonryRef.current = masonry;
      masonry.layout?.();
    });

    return () => {
      cancelled = true;
      masonryRef.current?.destroy?.();
      masonryRef.current = null;
    };
    // options are treated as static, matching react-masonry-component
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // relayout whenever children change
  useIsomorphicLayoutEffect(() => {
    const masonry = masonryRef.current;
    if (!masonry) return;

    masonry.reloadItems?.();
    masonry.layout?.();
  });

  return (
    <div ref={containerRef} className={className} style={style}>
      {children}
    </div>
  );
};

export default Masonry;
