import React from 'react';
import styles from './TechInfoTable.module.scss';
import ITechInfoTableProps from './ITechInfoTableProps';
import { DateTime } from 'luxon';
import { css } from '../../../lib/utils/css';

const TechInfoTable: React.FC<ITechInfoTableProps> = ({ image, exposure }) => {
  return (
    <div>
      <div className={styles.subHeader}>Technical Information</div>
      <div className={styles.infoTable}>
        {image.timeTaken && (
          <>
            <div className={styles.cell}>Time Taken</div>
            <div className={styles.cell}>
              {DateTime.fromJSDate(image.timeTaken).toFormat(
                'dd/MM/yyyy HH:mm'
              )}
            </div>
          </>
        )}

        <div className={css(styles.cell, styles.stripe)}>Dimensions</div>
        <div className={css(styles.cell, styles.stripe)}>
          {image.width} x {image.height}
        </div>

        {exposure && (
          <>
            <div className={styles.cell}>Exposure</div>
            <div className={styles.cell}>{exposure}</div>
          </>
        )}

        {image.focalLength && (
          <>
            <div className={css(styles.cell, styles.stripe)}>Focal Length</div>
            <div className={css(styles.cell, styles.stripe)}>
              {image.focalLength}mm
            </div>
          </>
        )}

        {image.aperture && (
          <>
            <>
              <div className={styles.cell}>Aperture</div>
              <div className={styles.cell}>f/{image.aperture}</div>
            </>
          </>
        )}

        {image.iso && (
          <>
            <div className={css(styles.cell, styles.stripe)}>ISO</div>
            <div className={css(styles.cell, styles.stripe)}>{image.iso}</div>
          </>
        )}
      </div>
    </div>
  );
};

export default TechInfoTable;
