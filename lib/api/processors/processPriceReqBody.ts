import { Prisma, Price, PriceGroup } from '@prisma/client';
import { cloneDeep } from 'lodash';

function processPriceReqBody(
  _id: number,
  editValues: Partial<
    Price & { priceGroup?: PriceGroup; priceGroupId?: number }
  >
) {
  const ensureFloat = (value: any) =>
    !isNaN(value) ? parseFloat(value) ?? undefined : undefined;

  const saveValues: Prisma.PriceUpdateInput = cloneDeep(editValues) as any;
  saveValues.cost = ensureFloat(editValues.cost);
  saveValues.costPostage = ensureFloat(editValues.costPostage);

  if (editValues.priceGroup !== undefined) {
    saveValues.priceGroup = {
      connect: { id: editValues.priceGroup?.id },
    };
  } else if (!!editValues.priceGroupId) {
    saveValues.priceGroup = {
      connect: { id: parseInt(editValues.priceGroupId.toString()) },
    };
    delete (saveValues as any).priceGroupId;
  }

  return saveValues;
}

export default processPriceReqBody;
