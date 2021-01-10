import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../prisma';
import an from '../../utils/an';

interface IAggregate {
  model: keyof typeof prisma;
  multi?: boolean;
  key?: string;
}

interface ISearchField {
  field: string;
  childField?: string;
  multi?: boolean;
}

function parseValue(value: string): string | number | boolean | null {
  if (value === 'true' || value === 'false') {
    return value === 'true';
  }

  const asInt = parseInt(value);
  if (!isNaN(asInt)) {
    return asInt;
  }

  if (value === 'null') {
    return null;
  }

  return value;
}

interface IHandleListCrudParams {
  req: NextApiRequest;
  res: NextApiResponse;
  model: keyof typeof prisma;
  searchFields: ISearchField[];
  defaultOrderBy: { [key: string]: 'asc' | 'desc' };
  aggregates?: IAggregate[];
  baseFilter?: object;
}

async function handleListCrud({
  req,
  res,
  model,
  searchFields,
  defaultOrderBy,
  aggregates,
  baseFilter,
}: IHandleListCrudParams) {
  switch (req.method) {
    case 'GET': {
      const { $top, $skip, $orderBy, $search, $filter, $expand } = req.query;

      const expands = $expand ? ($expand as string).split(',') : undefined;

      const args: any = {};

      if (typeof $top === 'string') {
        args.take = parseInt($top as string);
      }

      if (typeof $skip === 'string') {
        args.skip = parseInt($skip as string);
      }

      if (typeof $orderBy === 'string') {
        const [field, dir] = $orderBy.split(' ');
        args.orderBy = { [field]: dir };
      } else {
        args.orderBy = defaultOrderBy;
      }

      if (baseFilter) {
        args.where = baseFilter;
      }

      const hasFilter = typeof $filter === 'string' && $filter.length;
      const hasSearch = typeof $search === 'string' && $search.length;

      if (hasFilter) {
        const filterQuery: any = {};

        const filters = ($filter as string).split(' and ');
        filters.forEach((filter) => {
          const [field, , value] = filter.split(' ');

          if (!value) {
            filterQuery[field] = { every: { id: { in: [] } } };
          } else if (expands?.includes(field)) {
            filterQuery[field] = {
              some: { id: { in: value.split(',').map(parseValue) } },
            };
          } else if (value.includes(',')) {
            filterQuery[field] = { in: value.split(',').map(parseValue) };
          } else {
            filterQuery[field] = parseValue(value);
          }
        });

        if (!args.where) {
          args.where = {};
        }
        args.where = { ...args.where, ...filterQuery };
      }

      if (hasSearch) {
        // TODO: Better type
        const searchQuery: any[] = [];

        const query = ($search as string).trim();

        searchFields.forEach((search) => {
          if (search.childField) {
            if (!search.multi) {
              searchQuery.push({
                [search.field]: {
                  [search.childField]: { contains: query },
                },
              });
            } else {
              searchQuery.push({
                [search.field]: {
                  some: { [search.childField]: { contains: query } },
                },
              });
            }
          } else {
            searchQuery.push({ [search.field]: { contains: query } });
          }
        });

        if (hasFilter) {
          args.where.OR = searchQuery;
        } else {
          args.where = { OR: searchQuery };
        }
      }

      if (expands) {
        args.include = {};
        expands.forEach((expand) => {
          args.include[expand] = true;
        });
      }

      // TODO: better type
      let data = await (prisma[model] as any).findMany(args);
      const total = await (prisma[model] as any).count({ where: args.where });

      if (aggregates) {
        for (const item of data) {
          for (const aggregate of aggregates) {
            if (!aggregate.multi) {
              item[`${aggregate.model}Count`] = await (prisma[
                aggregate.model
              ] as any).count({
                where: { [aggregate.key ?? `${model}Id`]: item.id },
              });
            } else {
              item[`${aggregate.model}Count`] = await (prisma[
                aggregate.model
              ] as any).count({
                where: {
                  [aggregate.key ?? `${model}s`]: { some: { id: item.id } },
                },
              });
            }
          }
        }
      }

      return res.status(200).json({ data, total });
    }
    case 'POST':
      // TODO: better type
      try {
        const newItem = await (prisma[model] as any).create({ data: req.body });
        return res.status(201).send(newItem);
      } catch (err) {
        if (err.message?.includes('name_unique')) {
          res.status(400).send(`${an(model)} with this name already exists.`);
        } else {
          res.status(500).send(err.message);
          throw err;
        }
      }

    default: {
      res.setHeader('Allow', 'GET,POST');
      return res.status(405).end('Method Not Allowed');
    }
  }
}

export default handleListCrud;
