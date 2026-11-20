import ILinkLargeProps from '../../components/linkLarge/ILinkLargeProps';
import { faEnvelope } from '@fortawesome/free-solid-svg-icons/faEnvelope';
import { faFacebook } from '@fortawesome/free-brands-svg-icons/faFacebook';
import { faInstagram } from '@fortawesome/free-brands-svg-icons/faInstagram';
import { faPaypal } from '@fortawesome/free-brands-svg-icons/faPaypal';
import { getContentFile } from '../../lib/utils/content';

const iconRedbubble = getContentFile('contacts/redbubble.svg');

const links: ILinkLargeProps[] = [
  {
    label: 'Email',
    href: 'mailto:rstanger.photos@gmail.com',
    icon: faEnvelope,
  },
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/RogerStangerPhotography',
    icon: faFacebook,
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/rogerstangerphotography',
    icon: faInstagram,
  },
  {
    label: 'PayPal',
    href: 'https://paypal.me/rstangerphotos',
    icon: faPaypal,
  },
  {
    label: 'Redbubble',
    href: 'https://rogerstanger.redbubble.com',
    icon: iconRedbubble,
  },
];

export default links;
