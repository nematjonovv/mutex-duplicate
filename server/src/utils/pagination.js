// server/src/utils/pagination.js
import { z } from "zod";

export const paginationSchema = z.object({
  page: z.preprocess((val) => val === undefined ? "1" : val, z.union([z.string(), z.number()]).transform(Number).pipe(z.number().min(1)).default(1)),
  limit: z.preprocess((val) => val === undefined ? "10" : val, z.union([z.string(), z.number()]).transform(Number).pipe(z.number().min(1).max(2000)).default(10)),
  populate: z.string().optional(), // Added populate to schema
  sort: z.record(z.union([z.literal(1), z.literal(-1)])).optional(), // Added sort to schema
});

export const paginate = async (model, query = {}, options = {}) => {
  const { page, limit, populate, sort } = paginationSchema.parse(options);
  const skip = (page - 1) * limit;

  const findQuery = model.find(query);

  if (populate) {
    findQuery.populate(populate);
  }
  if (sort) {
    findQuery.sort(sort);
  }

  const [data, total] = await Promise.all([
    findQuery
      .skip(skip)
      .limit(limit)
      .lean(),
    model.countDocuments(query),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
};