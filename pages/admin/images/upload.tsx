import React, { useCallback, useState } from 'react';
import styles from './EditForm.module.scss';
import AdminLayout from '../../../components/admin/AdminLayout';
import ImageForm from '../../../components/admin/imageForm/ImageForm';
import ImageUploading from 'react-images-uploading';
import { ImageListType } from 'react-images-uploading/dist/typings';
import { css } from '../../../lib/utils/css';
import getNameFromFile from '../../../lib/getNameFromFile';
import { GetServerSideProps } from 'next';
import type { Image, Category, PriceGroup, Prisma } from '@prisma/client';
import prisma from '../../../lib/client/prisma';
import { useRouter } from 'next/router';
import ImageService from '../../../lib/services/image';
import isError from '../../../lib/utils/isError';
import { serializeProps } from '../../../lib/utils/superjsonProps';
import {
  createProcessingCopy,
  uploadImageFiles,
} from '../../../lib/client/imageUpload';

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

const PROCESSING_POLL_INTERVAL_MS = 2000;
const PROCESSING_TIMEOUT_MS = 2 * 60 * 1000;

/**
 * Waits for the image processor to fill in the image dimensions,
 * which it does as the final step of processing.
 */
async function waitForProcessing(id: number): Promise<boolean> {
  const deadline = Date.now() + PROCESSING_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, PROCESSING_POLL_INTERVAL_MS));

    const res = await fetch(`/api/image/${id}`);
    if (res.ok) {
      const image = (await res.json()) as Image;
      if (image.width > 0) return true;
    }
  }

  return false;
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
    async (saveData: Prisma.ImageCreateInput) => {
      setProgress(0);
      setServerMessages(undefined);
      setError(undefined);

      const file = images[0].file!;

      // Created before the image record, so a failure leaves nothing behind
      let processingCopy: Blob | undefined;
      try {
        setServerMessages(['Preparing image...']);
        processingCopy = await createProcessingCopy(file);
      } catch (error) {
        setServerMessages(undefined);
        setError((error as Error)?.message || String(error));
        return;
      }

      setServerMessages(
        processingCopy
          ? [
              `Created a ${formatBytes(processingCopy.size)} processing copy; ` +
                'the original is uploaded unchanged.',
            ]
          : undefined
      );

      // width and height are required, but set by the image processor
      saveData.width = 0;
      saveData.height = 0;

      const image = await ImageService.createImage(saveData);
      if (isError(image)) {
        setError(image.message);
        return;
      }

      try {
        await uploadImageFiles(image.id, file, processingCopy, setProgress);
      } catch (error) {
        setError((error as Error)?.message || String(error));
        await ImageService.deleteImage(image.id);
        return;
      }

      setServerMessages((messages) => [
        ...(messages ?? []),
        'Upload complete, waiting for processing...',
      ]);

      if (await waitForProcessing(image.id)) {
        await router.push(`/admin/images/${image.id}`);
      } else {
        setError(
          'Processing is taking longer than expected. The image has been uploaded; ' +
            'check the image-processor worker logs, or reprocess it with ' +
            `POST /api/image/${image.id}/process.`
        );
      }
    },
    [images, router]
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
                      {/* eslint-disable-next-line @next/next/no-img-element */}
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
    props: serializeProps({
      categories,
      priceGroups,
    }),
  };
};

export default UploadImage;
