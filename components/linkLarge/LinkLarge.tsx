import React from 'react';
import styles from './LinkLarge.module.scss';
import ILinkLargeProps from './ILinkLargeProps';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconDefinition } from '@fortawesome/free-brands-svg-icons';

const LinkLarge: React.FC<ILinkLargeProps> = ({ href, icon, label }) => {
  return (
    <div className={styles.linkLarge}>
      <a href={href} target='_blank' rel='noopener noreferrer'>
        {isIconDefinition(icon) ? (
          <FontAwesomeIcon
            icon={icon}
            style={{ width: 'unset', height: '1em' }}
          />
        ) : (
          <div
            className={styles.customIcon}
            dangerouslySetInnerHTML={{ __html: icon }}
          ></div>
        )}
        <div className={styles.label}>{label}</div>
      </a>
    </div>
  );
};

function isIconDefinition(
  icon: IconDefinition | string
): icon is IconDefinition {
  return !!(icon as IconDefinition).iconName;
}

export default LinkLarge;
