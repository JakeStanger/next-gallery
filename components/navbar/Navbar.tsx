import React, { useCallback, useState } from 'react';
import styles from './Navbar.module.scss';
import INavbarProps from './INavbarProps';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { css } from '../../lib/utils/css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars } from '@fortawesome/free-solid-svg-icons';

const Branding: React.FC<{ title?: string; homeUrl?: string }> = ({
  title,
  homeUrl,
}) => {
  return (
    <Link href={homeUrl ?? '/'}>
      <div className={styles.branding}>
        <div className={styles.logo}>
          <img
            src={'/images/logo-small_64.png'}
            alt={'logo'}
            width={64}
            height={64}
          />
        </div>
        {title && <div className={styles.title}>{title}</div>}
      </div>
    </Link>
  );
};

const Navbar: React.FC<INavbarProps> = ({ links, title, homeUrl }) => {
  const router = useRouter();

  const [open, setOpen] = useState(false);

  const toggleOpen = useCallback(() => {
    setOpen(!open);
  }, [open]);

  return (
    <nav className={styles.navBar}>
      <div className={css(styles.links, open && styles.open)}>
        <Branding title={title} homeUrl={homeUrl} />
        {links.map((link) => (
          <div
            key={link.href}
            className={css(
              styles.link,
              router.pathname === link.href && styles.active
            )}
          >
            {!link.href.startsWith('http') ? (
              <Link href={link.href}>{link.label}</Link>
            ) : (
              <a href={link.href} target={'_blank'} rel='noopener noreferrer'>
                {link.label}
              </a>
            )}
          </div>
        ))}
      </div>
      <div>
        <div className={styles.mobileArea}>
          <Branding title={title} homeUrl={homeUrl} />
          <div className={styles.hamburger} onClick={toggleOpen}>
            <FontAwesomeIcon icon={faBars}></FontAwesomeIcon>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
