import React, { useEffect } from 'react';
import styles from './AdminLayout.module.scss';
import Head from 'next/head';
import Navbar from '../navbar/Navbar';
import adminNavLinks from '../../content/admin/navLinks';
import { MuiPickersUtilsProvider } from '@material-ui/pickers';
import LuxonUtils from '@date-io/luxon';
import { createMuiTheme, ThemeProvider } from '@material-ui/core/styles';
import { useSession, signIn } from 'next-auth/client';
import meta from '../../content/meta';

const theme = createMuiTheme({
  palette: {
    primary: {
      main: '#866d24',
    },
    secondary: {
      main: '#707176',
    },
  },
});

const AdminLayout: React.FC = ({ children }) => {
  const [session, loading] = useSession();

  useEffect(() => {
    if (!loading && !session && process.env.NODE_ENV !== 'development') {
      signIn('google', { callbackUrl: location.href }).catch(console.error);
    }
  }, [session, loading]);

  return (
    <div>
      <Head>
        <link rel='icon' href='/favicon.ico' />
        <title>Admin Area | {meta.siteTitle}</title>
        <link
          rel='stylesheet'
          href='https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap'
        />
        <link
          rel='stylesheet'
          href='https://fonts.googleapis.com/icon?family=Material+Icons'
        />
      </Head>
      <Navbar links={adminNavLinks} title={'Admin Area'} homeUrl={'/admin'} />
      <div className={styles.container}>
        <ThemeProvider theme={theme}>
          <MuiPickersUtilsProvider utils={LuxonUtils}>
            {(!loading && session) || process.env.NODE_ENV === 'development' ? (
              children
            ) : (
              <div>Authorizing, please wait...</div>
            )}
          </MuiPickersUtilsProvider>
        </ThemeProvider>
      </div>
    </div>
  );
};

export default AdminLayout;
