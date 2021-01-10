import { ILink } from '../../components/navbar/INavbarProps';

const navLinks: ILink[] = [
  {
    label: 'Images',
    href: '/admin/images',
  },
  {
    label: 'Categories',
    href: '/admin/categories',
  },
  {
    label: 'Groups',
    href: '/admin/groups',
  },
  {
    label: 'Price Groups',
    href: '/admin/pricegroups',
  },
  {
    label: 'Prices',
    href: '/admin/prices',
  },
  {
    label: 'Events',
    href: '/admin/events',
  },
  {
    label: 'Back to Site',
    href: '/',
  },
];

export default navLinks;
