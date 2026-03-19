import { createTRPCRouter, rateLimitedProcedure } from "../trpc";
import {
  createProgressPhotoSchema,
  uploadProgressPhotoSchema,
  deleteProgressPhotoSchema,
} from "@ironpulse/shared";
import { getPresignedUploadUrl, getPresignedDownloadUrl } from "../lib/s3";

export const progressPhotoRouter = createTRPCRouter({
  getUploadUrl: rateLimitedProcedure
    .input(uploadProgressPhotoSchema)
    .mutation(async ({ ctx, input }) => {
      const ext = input.contentType.split("/")[1] ?? "jpg";
      const key = `progress-photos/${ctx.user.id}/${Date.now()}.${ext}`;
      const uploadUrl = await getPresignedUploadUrl(key, input.contentType);
      return { uploadUrl, photoUrl: key };
    }),

  create: rateLimitedProcedure
    .input(createProgressPhotoSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.progressPhoto.create({
        data: {
          userId: ctx.user.id,
          photoUrl: input.photoUrl,
          date: new Date(input.date),
          notes: input.notes,
        },
      });
    }),

  list: rateLimitedProcedure.query(async ({ ctx }) => {
    const photos = await ctx.db.progressPhoto.findMany({
      where: { userId: ctx.user.id },
      orderBy: { date: "desc" },
      take: 50,
    });

    return Promise.all(
      photos.map(async (photo) => ({
        ...photo,
        imageUrl: await getPresignedDownloadUrl(photo.photoUrl, 3600),
      }))
    );
  }),

  delete: rateLimitedProcedure
    .input(deleteProgressPhotoSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.progressPhoto.deleteMany({
        where: { id: input.id, userId: ctx.user.id },
      });
      return { success: true };
    }),
});
