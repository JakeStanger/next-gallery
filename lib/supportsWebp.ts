function hasWebpSupport() {
  const userAgent = navigator.userAgent;
  return !(userAgent.includes('Mac OS X')/* && !userAgent.includes('Version/14')*/);
}

export default hasWebpSupport;
