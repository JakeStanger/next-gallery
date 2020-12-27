import React from 'react';
import styles from './Button.module.scss';
import IButtonProps from './IButtonProps';

const Button: React.FC<IButtonProps> = ({ onClick, disabled, text }) => {
  return (
    <button className={styles.button} onClick={onClick} disabled={disabled}>
      {text}
    </button>
  );
};

export default Button;
