import React, { useCallback, useEffect, useState } from 'react';
import styles from './ScrollTop.module.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowCircleUp } from '@fortawesome/free-solid-svg-icons';

const ScrollTop: React.FC = () => {
  const [showScroll, setShowScroll] = useState(false);

  const checkScrollTop = useCallback(() => {

    if (!showScroll && window.pageYOffset > 400) {
      setShowScroll(true);
    } else if (showScroll && window.pageYOffset <= 400) {
      setShowScroll(false);
    }
  }, [showScroll]);

  const scrollTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', checkScrollTop);

    return () => window.removeEventListener('scroll', checkScrollTop)
  }, [checkScrollTop]);

  return (
    <div
      className={styles.scrollTop}
      onClick={scrollTop}
      style={{ display: showScroll ? 'flex' : 'none' }}
    >
      <FontAwesomeIcon icon={faArrowCircleUp} className={styles.icon} />
    </div>
  );
};

export default ScrollTop;
