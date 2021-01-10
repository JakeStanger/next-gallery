import React from 'react';
import styles from './index.module.scss';
import Layout from '../../components/Layout';
import { GetStaticProps } from 'next';
import { getMarkdownContent } from '../../lib/utils/content';
import { DateTime } from 'luxon';
import { css } from '../../lib/utils/css';
import prisma from '../../lib/prisma';
import { Event } from '@prisma/client';

interface IProps {
  preamble: string;
  events: Event[];
}

const Interval: React.FC<{
  className: string;
  start: Date;
  end: Date;
}> = ({ className, start, end }) => {
  const FORMAT_LONG = 'ccc dd LLL HH:mm';
  const FORMAT_SHORT = 'HH:mm';

  const startDate = DateTime.fromJSDate(start);
  const endDate = DateTime.fromJSDate(end);

  const startFormatted = startDate.toFormat(FORMAT_LONG);
  const endFormatted = endDate.toFormat(
    startDate.day === endDate.day ? FORMAT_SHORT : FORMAT_LONG
  );

  return (
    <div className={className}>
      {startFormatted} - {endFormatted}
    </div>
  );
};

const index: React.FC<IProps> = ({ preamble, events }) => {
  return (
    <Layout title={'Events'}>
      <div dangerouslySetInnerHTML={{ __html: preamble }}></div>
      <div className={styles.eventsTable}>
        <div className={styles.header}>Time</div>
        <div className={styles.header}>Name</div>
        <div className={styles.header}>Location</div>
        {events.map((event, i) => {
          const className = css(styles.cell, i % 2 === 1 && styles.stripe);
          return (
            <React.Fragment key={event.id}>
              <Interval
                className={className}
                start={event.startTime}
                end={event.endTime}
              />
              <div className={className}>{event.name}</div>
              <div className={className}>{event.location}</div>
            </React.Fragment>
          );
        })}
        {!events.length && <div>There are currently no upcoming events.</div>}
      </div>
    </Layout>
  );
};

export const getStaticProps: GetStaticProps<IProps> = async () => {
  const events = await prisma.event
    .findMany({ where: { endTime: { gt: new Date() } } })

  const preamble = await getMarkdownContent('events', 'preamble');

  return {
    props: {
      preamble,
      events,
    },
    revalidate: 15
  };
};

export default index;
