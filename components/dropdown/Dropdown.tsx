import React from "react";
import styles from "./Dropdown.module.scss";
import IDropdownProps from "./IDropdownProps";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";

const Dropdown: React.FC<IDropdownProps> = ({
  value,
  onChange,
  options,
  placeholder
}) => {
  return (
    <div className={styles.dropdown}>
      <select
        // id="groupBy"
        // name="mode"
        value={value}
        onChange={ev => onChange(ev.target.value)}
        placeholder={placeholder}
      >
        {options.map(option => (
          <option key={option.key} value={option.key}>
            {option.value}
          </option>
        ))}
      </select>
      <FontAwesomeIcon className={styles.arrow} icon={faChevronDown} />
    </div>
  );
};

export default Dropdown;
