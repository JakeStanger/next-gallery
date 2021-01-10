import React from 'react';
import styles from './GroupCard.module.scss';
import IGroupCardProps from './IGroupCardProps';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLayerGroup } from '@fortawesome/free-solid-svg-icons/faLayerGroup';
import Card from '../Card';

const GroupCard: React.FC<IGroupCardProps> = ({ group, width }) => {
  return (
    <Card
      image={group.primaryImage || group.images[0]}
      width={width}
      title={group.name}
      href={`/group/${group.id}`}
    >
      <div className={styles.groupIndicator}>
        <FontAwesomeIcon icon={faLayerGroup} />
        <span className={styles.text}>{group.images.length}</span>
      </div>
    </Card>
  );
};

export default GroupCard;
