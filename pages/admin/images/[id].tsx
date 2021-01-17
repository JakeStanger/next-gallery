import React, { useCallback, useState } from 'react';
import styles from './EditForm.module.scss';
import AdminLayout from '../../../components/admin/AdminLayout';
import { GetServerSideProps } from 'next';
import prisma from '../../../lib/prisma';
import Image from '../../../components/image/Image';
import { Category, PriceGroup, ImageUpdateInput } from '@prisma/client';
import FullImage from '../../../lib/types/FullImage';
import ImageForm from '../../../components/admin/imageForm/ImageForm';
import { useRouter } from 'next/router';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@material-ui/core';
import ImageService from '../../../lib/services/image';

interface IServerSideProps {
  categories: Category[];
  image: FullImage;
  priceGroups: PriceGroup[];
}

const EditImage: React.FC<IServerSideProps> = ({
  image,
  categories,
  priceGroups,
}) => {
  const router = useRouter();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [error, setError] = useState<string>();

  const width = 360; // TODO: Base on screen size
  const height = image.height * (width / image.width);

  const onSave = useCallback(async (saveValues: ImageUpdateInput) => {
    setError(undefined);
    const error = await ImageService.updateImage(image.id, saveValues);
    if (!error) {
      router.reload();
    } else {
      setError(error.message);
    }
  }, []);

  const onDelete = useCallback(async () => {
    setShowDeleteDialog(false);
    setError(undefined);

    const error = await ImageService.deleteImage(image.id);
    if(!error) {
      await router.push('/admin/images');
    } else {
      setError(error.message);
    }
  }, []);

  const onMakePrimary = useCallback(async () => {
    setError(undefined);
    const error = await ImageService.makeGroupPrimary(image.id, image.groupId!);
    if(!error) {
      await router.reload();
    } else {
      setError(error.message);
    }
  }, []);

  const toggleDeleteDialog = useCallback(() => {
    setShowDeleteDialog(!showDeleteDialog);
  }, [showDeleteDialog]);

  return (
    <AdminLayout>
      <div className={styles.container}>
        <div className={styles.infoPane}>
          <Image
            imageId={image.id}
            alt={image.name}
            width={360}
            height={height}
            layout={'intrinsic'}
          />
          <div className={styles.buttons}>
            <Button
              variant='contained'
              color='primary'
              href={`/image/${image.id}`}
              target={'_blank'}
            >
              View Image
            </Button>
            {image.group && (
              <Button
                variant='contained'
                color='primary'
                onClick={onMakePrimary}
                disabled={image.group?.primaryImageId === image.id}
              >
                Make group primary
              </Button>
            )}
            <Button
              variant='contained'
              color='secondary'
              onClick={toggleDeleteDialog}
            >
              Delete
            </Button>
          </div>
          {error && <div className={styles.error}>{error}</div>}
        </div>
        <div style={{ flex: 1 }}>
          <ImageForm
            image={image}
            categories={categories}
            priceGroups={priceGroups}
            onSave={onSave}
          />
          {error && <div className={styles.error}>{error}</div>}
        </div>
      </div>
      <Dialog open={showDeleteDialog} onClose={toggleDeleteDialog}>
        <DialogTitle>{'Delete this image?'}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this image? All database records and
            associated files will be removed.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={onDelete} color='primary'>
            Delete
          </Button>
          <Button onClick={toggleDeleteDialog} color='secondary' autoFocus>
            Dismiss
          </Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
};

export const getServerSideProps: GetServerSideProps<IServerSideProps> = async ({
  params,
}) => {
  const id = parseInt(params?.id as string);
  if (!id || isNaN(id)) {
    return {
      notFound: true,
    };
  }

  const image = await prisma.image.findUnique({
    where: { id },
    include: {
      categories: true,
      group: true,
      location: true,
      tags: true,
      priceGroup: true,
    },
  });

  if (!image) {
    return {
      notFound: true,
    };
  }

  const categories = await prisma.category.findMany();
  const priceGroups = await prisma.priceGroup.findMany();

  return {
    props: {
      image,
      categories,
      priceGroups,
    },
  };
};

export default EditImage;
