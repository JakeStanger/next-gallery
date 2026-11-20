import type { Prisma } from '@prisma/client';
import FullImage from '../../types/FullImage';
import { cloneDeep } from 'lodash';

/** Parses a relation id from a form/table value; null, '' and 'null' mean "none" */
function parseRelationId(value: unknown): number | undefined {
  const id = parseInt(String(value));
  return isNaN(id) ? undefined : id;
}

// TODO: Type editValues
function processImageReqBody(id: number, editValues: Partial<FullImage>) {
  const newImage = id === undefined;

  const ensureInt = (value: any) =>
    !isNaN(value) ? parseInt(value) ?? undefined : undefined;
  const ensureFloat = (value: any) =>
    !isNaN(value) ? parseFloat(value) ?? undefined : undefined;

  // perform pre-save transforms
  const saveValues: Prisma.ImageUpdateInput = cloneDeep(editValues) as any;
  saveValues.iso = ensureInt(editValues.iso);
  saveValues.exposure = ensureFloat(editValues.exposure);
  saveValues.aperture = ensureFloat(editValues.aperture);
  // focal length is a Float column (e.g. 18.5mm)
  saveValues.focalLength = ensureFloat(editValues.focalLength);

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
    saveValues.priceGroup = editValues.priceGroup
      ? { connect: { id: editValues.priceGroup.id } }
      : { disconnect: true };
  } else if (editValues.priceGroupId !== undefined) {
    // the admin table's "No Price Group" option sends null/'null'
    const priceGroupId = parseRelationId(editValues.priceGroupId);
    saveValues.priceGroup = priceGroupId
      ? { connect: { id: priceGroupId } }
      : { disconnect: true };
    delete (saveValues as any).priceGroupId;
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
  } else if (editValues.groupId !== undefined) {
    const groupId = parseRelationId(editValues.groupId);
    saveValues.group = groupId
      ? { connect: { id: groupId } }
      : { disconnect: true };

    delete (saveValues as any).groupId;
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
