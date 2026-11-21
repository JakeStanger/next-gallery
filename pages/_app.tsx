import { AppProps } from 'next/app';
import router from 'next/router';
import NProgress from 'nprogress';
import '../styles/global.scss';
import '@fortawesome/fontawesome-svg-core/styles.css';
import './nprogress.scss';
import { SessionProvider } from 'next-auth/react';
import { deserializeProps } from '../lib/utils/superjsonProps';

// progress bar events
router.events.on('routeChangeStart', () => NProgress.start());
router.events.on('routeChangeComplete', () => NProgress.done());
router.events.on('routeChangeError', () => NProgress.done());

export default function App(props: AppProps) {
  const { Component } = props;
  const pageProps = deserializeProps(props.pageProps);

  return (
    <SessionProvider session={(pageProps as any).session}>
      <Component {...pageProps} />
    </SessionProvider>
  );
}
