import { useEffect, useState } from 'react';
import getImageUrl from '../getImageUrl';
import supportsWebp from '../supportsWebp';

function useImageSrc(imageId: number, full?: boolean) {
  const [src, setSrc] = useState(getImageUrl(imageId, full));

  useEffect(() => {
    const useWebp = supportsWebp();
    if (useWebp) {
      setSrc(getImageUrl(imageId, full));
    } else {
      setSrc(`/api/image/${imageId}/${full === true ? 'full' : 'thumb'}?jpeg`);
    }
  }, [imageId, full]);

  return src;
}

export default useImageSrc;
