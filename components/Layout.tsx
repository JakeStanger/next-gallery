import Head from 'next/head';
import styles from './Layout.module.scss';
import Navbar from './navbar/Navbar';
import navLinks from '../content/navLinks';
import { css } from '../lib/utils/css';
import ILayoutProps from './ILayoutProps';
import meta from '../content/meta';

export default function Layout({
  children,
  title,
  description,
  imageUrl,
  fullWidth,
}: ILayoutProps) {
  const fullTitle = `${title} | ${meta.siteTitle}`;

  const desc = description ?? meta.description;
  const img = imageUrl ?? meta.imageUrl;

  return (
    <div>
      <Head>
        <link rel='icon' href='/favicon.ico' />

        {/* HTML meta tags */}
        <title>{fullTitle}</title>
        <meta name='description' content={desc} />
        <meta name='theme-color' content={meta.color} />

        {/* Search engine tags */}
        <meta itemProp='name' content={fullTitle} />
        <meta itemProp='description' content={desc} />
        <meta itemProp='image' content={imageUrl} />

        {/* Facebook meta tags */}
        <meta property='og:type' content='website' />
        <meta property='og:title' content={fullTitle} />
        <meta property='og:description' content={desc} />
        <meta property='og:image' content={img} />

        {/* Twitter meta tags */}
        <meta name='twitter:card' content='summary_large_image' />
        <meta name='twitter:title' content={fullTitle} />
        <meta name='twitter:description' content={desc} />
        <meta name='twitter:image' content={img} />

        <link
          href='https://fonts.googleapis.com/css?family=Raleway&display=swap'
          rel='stylesheet'
        />
      </Head>
      <Navbar links={navLinks} />
      <div className={css(styles.container, fullWidth && styles.fullWidth)}>
        <main>{children}</main>
      </div>
    </div>
  );
}
