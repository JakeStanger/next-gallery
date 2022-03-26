import { Category } from '@prisma/client';

/**
 * Category with list of associated IDs.
 */
type ExpandedCategory = Category & { items: string[]; thumbnail: number };

export default ExpandedCategory;
