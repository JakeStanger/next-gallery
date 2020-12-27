import React from "react";
import styles from "./Checkbox.module.scss";
import ICheckboxProps from "./ICheckboxProps";

const Checkbox: React.FC<ICheckboxProps> = ({checked, onChange, label}) => {
  return (
    <div className={styles.checkboxContainer}>
      <label>
        {label}
        <input
          type="checkbox"
          checked={checked}
          onChange={ev => onChange(ev.target.checked)}
        />
        <span className={styles.checkbox} />
      </label>
    </div>
  );
};

export default Checkbox;
