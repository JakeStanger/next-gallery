interface IDropdownProps {
  value: string | number | undefined;
  onChange: (value: string) => void;
  options: {key: string | number, value: string}[];
  placeholder?: string;
}

export default IDropdownProps;
