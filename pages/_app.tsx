import { AppProps } from 'next/app';
import router from 'next/router';
import NProgress from 'nprogress';
import '../styles/global.scss';
import '@fortawesome/fontawesome-svg-core/styles.css';
import './nprogress.scss';
import '@stripe/stripe-js';

// progress bar events
router.events.on('routeChangeStart', () => NProgress.start());
router.events.on('routeChangeComplete', () => NProgress.done());
router.events.on('routeChangeError', () => NProgress.done());

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
