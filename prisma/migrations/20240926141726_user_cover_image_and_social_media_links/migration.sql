/*
  Warnings:

  - A unique constraint covering the columns `[user_id,platform]` on the table `SocialMediaLinks` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "coverImage" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "SocialMediaLinks_user_id_platform_key" ON "SocialMediaLinks"("user_id", "platform");
