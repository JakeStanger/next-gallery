import superjson from 'superjson';

/**
 * Data functions (getStaticProps / getServerSideProps) wrap their props with
 * `serializeProps` so Dates, Maps etc. survive Next's JSON serialisation;
 * `_app.tsx` restores them with `deserializeProps` before rendering the page.
 *
 * Done explicitly rather than with an SWC plugin, as those are tied to the
 * Next.js compiler ABI.
 */
const SUPERJSON_KEY = '__superjson';

type SerializedProps = { [SUPERJSON_KEY]: ReturnType<typeof superjson.serialize> };

export function serializeProps<P extends object>(props: P): P {
  return {
    [SUPERJSON_KEY]: superjson.serialize(props),
  } as SerializedProps as unknown as P;
}

export function deserializeProps<P extends object>(pageProps: P): P {
  if (pageProps && SUPERJSON_KEY in pageProps) {
    return superjson.deserialize(
      (pageProps as unknown as SerializedProps)[SUPERJSON_KEY]
    ) as P;
  }

  return pageProps;
}
