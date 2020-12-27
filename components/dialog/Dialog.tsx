import React from 'react';
import styles from './Dialog.module.scss';
import IDialogProps from './IDialogProps';
import { faTimes } from '@fortawesome/free-solid-svg-icons/faTimes';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const Dialog: React.FC<IDialogProps> = ({
  isOpen,
  onDismiss,
  title,
  children,
}) => {
  return isOpen ? (
    <div className={styles.modal} onClick={onDismiss}>
      <div className={styles.dialog} onClick={(ev) => ev.stopPropagation()}>
        <div className={styles.closeBtn} onClick={onDismiss}>
          <FontAwesomeIcon icon={faTimes} />
        </div>
        <div className={styles.title}>{title}</div>
        {children}
      </div>
    </div>
  ) : null;
};

export default Dialog;
