import React, { useCallback, useState } from 'react';
import styles from './EditForm.module.scss';
import AdminLayout from '../../../components/admin/AdminLayout';
import ImageForm from '../../../components/admin/imageForm/ImageForm';
import ImageUploading from 'react-images-uploading';
import { ImageListType } from 'react-images-uploading/dist/typings';
import { css } from '../../../lib/utils/css';
import getNameFromFile from '../../../lib/getNameFromFile';
import { GetServerSideProps } from 'next';
import { Category, PriceGroup, ImageCreateInput } from '@prisma/client';
import prisma from '../../../lib/prisma';
import { useRouter } from 'next/router';
import ImageService from '../../../lib/services/image';
import isError from '../../../lib/utils/isError';

interface IServerSideProps {
  categories: Category[];
  priceGroups: PriceGroup[];
}

function formatBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + sizes[i];
}

function uploadWithProgress(
  url: string,
  formData: FormData,
  onUploadProgress: (
    progress: ProgressEvent<XMLHttpRequestEventTarget>
  ) => void,
  onEvent: (message: string, response: string) => void
) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener('progress', onUploadProgress);

    xhr.open('POST', url);

    let seenBytes = 0;
    xhr.onreadystatechange = () => {
      if (xhr.readyState == 3) {
        const newData = xhr.response.substr(seenBytes);
        seenBytes = xhr.responseText.length;

        if (xhr.status < 400) {
          onEvent(newData, xhr.response);
        } else {
          reject(xhr.response);
          xhr.abort();
        }
      } else if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          resolve(xhr.response);
        } else {
          reject(xhr.response);
        }
      }
    };

    xhr.send(formData);
  });
}

const UploadImage: React.FC<IServerSideProps> = ({
  categories,
  priceGroups,
}) => {
  const router = useRouter();

  const [images, setImages] = useState<ImageListType>([]);

  const [progress, setProgress] = useState(0);
  const [serverMessages, setServerMessages] = useState<string[]>();
  const [error, setError] = useState<string>();

  const onChange = (imageList: ImageListType) => {
    setImages(imageList);
    setProgress(0);
    setServerMessages(undefined);
    setError(undefined);
  };

  const uploadImage = useCallback(
    async (saveData: ImageCreateInput) => {
      setProgress(0);
      setServerMessages(undefined);
      setError(undefined);

      // width and height are required, but set on upload
      saveData.width = 0;
      saveData.height = 0;

      const image = await ImageService.createImage(saveData);
      if(isError(image)) {
        setError(image.message);
        return;
      }

      const formData = new FormData();
      formData.append('file', images[0].file!);

      await uploadWithProgress(
        `/api/image/${image.id}/upload`,
        formData,
        (progress) => {
          setProgress(progress.loaded / progress.total);
        },
        (_, response) => setServerMessages(response.split('\n'))
      )
        .then(async () => {
          await router.push(`/admin/images/${image.id}`);
        })
        .catch(async (error) => {
          setError(error);
          await ImageService.deleteImage(image.id);
        });
    },
    [images]
  );

  const progressPercent = Math.round(progress * 100);

  return (
    <AdminLayout>
      <div className={styles.container}>
        <div className={styles.infoPane}>
          <ImageUploading
            value={images}
            onChange={onChange}
            dataURLKey='data_url'
          >
            {({ imageList, onImageUpload, isDragging, dragProps }) => (
              <div
                className={css(styles.dropArea, isDragging && styles.dragging)}
                onClick={onImageUpload}
                {...dragProps}
              >
                {imageList.length ? (
                  imageList.map((image, index) => (
                    <div key={index}>
                      <img src={image['data_url']} alt='' width='360' />
                      <div className={styles.label}>
                        <div>{image.file?.name}</div>
                        <div>{formatBytes(images[0]!.file!.size)}</div>
                      </div>
                      {!!progress && (
                        <div className={styles.progressBar}>
                          <div className={styles.label}>
                            <div>{progressPercent}%</div>
                          </div>
                          <div className={styles.barArea}>
                            <div
                              className={styles.bar}
                              style={{ width: `${progress * 100}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className={styles.label}>
                    Click or drop here to upload
                  </div>
                )}
              </div>
            )}
          </ImageUploading>
          <div className={styles.uploadInfo}>
            {(!!serverMessages?.length || progressPercent === 100) && (
              <div className={styles.messages}>
                {progressPercent === 100 && (
                  <div className={styles.message}>Processing image</div>
                )}
                {serverMessages?.map((message, i) => (
                  <div className={styles.message} key={i}>
                    {message}
                  </div>
                ))}
              </div>
            )}

            {error && <div className={styles.error}>{error}</div>}
            {images[0]?.file?.size! > 25_000_000 && (
              <div className={styles.error}>
                You are about to upload a very large file! (
                {formatBytes(images[0]!.file!.size)}) This will take a long time
                for users to load.
              </div>
            )}
          </div>
        </div>
        {!!images.length && (
          <ImageForm
            image={{}}
            initialName={getNameFromFile(images[0]?.file)}
            categories={categories}
            priceGroups={priceGroups}
            onSave={uploadImage as any}
            showExif={false}
          />
        )}
      </div>
    </AdminLayout>
  );
};

export const getServerSideProps: GetServerSideProps<IServerSideProps> = async () => {
  const categories = await prisma.category.findMany();
  const priceGroups = await prisma.priceGroup.findMany();

  return {
    props: {
      categories,
      priceGroups,
    },
  };
};

export default UploadImage;
