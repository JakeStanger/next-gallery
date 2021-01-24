function hasWebpSupport() {
  const userAgent = navigator?.userAgent;
  if(!userAgent) return true;
  return !(userAgent.includes('Mac OS X')/* && !userAgent.includes('Version/14')*/);
}

export default hasWebpSupport;
