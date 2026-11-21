import * as Sentry from '@sentry/nextjs';
import type { NextPage } from 'next';
import type { ErrorProps } from 'next/error';
import NextErrorComponent from 'next/error';

// Reports server errors rendered by this page to Sentry (404s are skipped).
const CustomError: NextPage<ErrorProps> = ({ statusCode }) => {
  return <NextErrorComponent statusCode={statusCode} />;
};

CustomError.getInitialProps = async (contextData) => {
  await Sentry.captureUnderscoreErrorException(contextData);

  return NextErrorComponent.getInitialProps(contextData);
};

export default CustomError;
