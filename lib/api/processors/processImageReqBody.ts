import { ImageUpdateInput } from '@prisma/client';
import FullImage from '../../types/FullImage';
import { cloneDeep } from 'lodash';

// TODO: Type editValues
function processImageReqBody(id: number, editValues: Partial<FullImage>) {
  const newImage = id === undefined;

  const ensureInt = (value: any) =>
    value ? parseInt(value) ?? undefined : undefined;
  const ensureFloat = (value: any) =>
    value ? parseFloat(value) ?? undefined : undefined;

  // perform pre-save transforms
  const saveValues: ImageUpdateInput = cloneDeep(editValues) as any;
  saveValues.iso = ensureInt(editValues.iso);
  saveValues.exposure = ensureFloat(editValues.exposure);
  saveValues.aperture = ensureFloat(editValues.aperture);
  saveValues.focalLength = ensureInt(editValues.focalLength);

  if (editValues.categories) {
    saveValues.categories = {
      [newImage ? 'connect' : 'set']:
        editValues.categories?.map((c) => ({ id: c.id })) || [],
    };
  }

  if (editValues.location !== undefined) {
    if (editValues.location !== null) {
      saveValues.location = {
        connectOrCreate: {
          where: { name: editValues.location.name },
          create: { name: editValues.location.name },
        },
      };
    } else {
      saveValues.location = { disconnect: true };
    }
  }

  if (editValues.priceGroup !== undefined) {
    saveValues.priceGroup = {
      connect: { id: editValues.priceGroup?.id },
    };
  }

  if (editValues.group !== undefined) {
    if (editValues.group !== null) {
      saveValues.group = {
        connectOrCreate: {
          where: { name: editValues.group.name },
          create: {
            name: editValues.group.name,
            primaryImage: { connect: { id } },
          },
        },
      };
    } else {
      saveValues.group = { disconnect: true };
    }
  }

  if (editValues.tags) {
    if (newImage) {
      saveValues.tags = {
        connectOrCreate: editValues.tags.map((tag) => ({
          create: { name: tag.name },
          where: { name: tag.name },
        })),
      };
    } else {
      saveValues.tags = {
        set: editValues.tags.filter((t) => t.id).map((t) => ({ id: t.id })),
        connectOrCreate: editValues.tags.map((tag) => ({
          create: { name: tag.name },
          where: { name: tag.name },
        })),
      };
    }
  }

  return saveValues;
}

export default processImageReqBody;
