/*
  Warnings:

  - Added the required column `user_otp` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "account_verified" BOOLEAN DEFAULT false,
ADD COLUMN     "user_otp" INTEGER NOT NULL;
