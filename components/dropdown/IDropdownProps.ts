interface IDropdownProps {
  value: string | number | undefined;
  onChange: (value: string) => void;
  options: {key: string | number, value: string}[];
}

export default IDropdownProps;
