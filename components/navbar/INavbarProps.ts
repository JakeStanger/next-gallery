interface INavbarProps {
  links: ILink[];
  title?: string;
  homeUrl?: string;
}

export interface ILink {
  label: string;
  href: string;
}

export default INavbarProps;
