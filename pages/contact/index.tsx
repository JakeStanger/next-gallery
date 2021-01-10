import Layout from '../../components/Layout';
import { GetStaticProps } from 'next';
import Image from 'next/image';
import { getMarkdownContent } from '../../lib/utils/content';
import LinkLarge from '../../components/linkLarge/LinkLarge';
import styles from './index.module.scss';
import links from '../../content/contacts/links';
import ILinkLargeProps from '../../components/linkLarge/ILinkLargeProps';
import meta from '../../content/meta';

interface IStaticProps {
  preamble: string;
  content: string;
  links: ILinkLargeProps[];
}

const Contact: React.FC<IStaticProps> = ({ preamble, content, links }) => {
  return (
    <Layout title={'Contact & About'}>
      <div className={styles.links}>
        {links.map((link) => (
          <LinkLarge key={link.href} {...link} />
        ))}
      </div>
      <div dangerouslySetInnerHTML={{ __html: preamble }}></div>
      <div>
        <div className={styles.image}>
          <Image
            src={'/images/photo.jpg'}
            alt={meta.artistName}
            title={meta.artistName}
            // this fits nicely
            width={700}
            height={467}
            layout={'responsive'}
          />
        </div>
        <div dangerouslySetInnerHTML={{ __html: content }}></div>
      </div>
    </Layout>
  );
};

export const getStaticProps: GetStaticProps<IStaticProps> = async () => {
  const preamble = await getMarkdownContent('contacts', 'preamble');
  const content = await getMarkdownContent('contacts', 'content');
  return {
    props: {
      preamble,
      content,
      links,
    },
  };
};

export default Contact;
