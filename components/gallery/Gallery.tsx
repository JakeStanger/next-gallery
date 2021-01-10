import React, { useCallback, useEffect, useState } from 'react';
import styles from './Gallery.module.scss';
import IGalleryProps from './IGalleryProps';
import Masonry from 'react-masonry-component';
import isGroup from '../../lib/utils/isGroup';
import Card from '../card/Card';
import GroupCard from '../card/groupCard/GroupCard';

function useResizeListener() {
  const getWidth = useCallback(() => {
    const WIDTH = 360;
    const MARGIN = 5;

    const CARD_SIZE = Math.min(WIDTH + MARGIN * 2, window.innerWidth);
    return [
      CARD_SIZE * Math.floor(window.innerWidth / CARD_SIZE),
      CARD_SIZE - MARGIN * 2,
    ];
  }, []);

  const [width, setWidth] = useState([0, 360]);

  useEffect(() => {
    const updateWidth = () => setWidth(getWidth());
    updateWidth();
    window.addEventListener('resize', updateWidth);

    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  return width;
}

const Gallery: React.FC<IGalleryProps> = ({ imagesAndGroups }) => {
  const [width, imageSize] = useResizeListener();

  return (
    <Masonry className={styles.masonry} style={{ width }}>
      {imagesAndGroups.map((imageOrGroup) => {
        return isGroup(imageOrGroup) ? (
          <GroupCard
            group={imageOrGroup}
            width={imageSize}
            key={`g-${imageOrGroup.id}`}
          />
        ) : (
          <Card image={imageOrGroup} width={imageSize} key={imageOrGroup.id} />
        );
      })}
    </Masonry>
  );
};

export default Gallery;
