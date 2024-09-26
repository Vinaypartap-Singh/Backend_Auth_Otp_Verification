-- AlterTable
ALTER TABLE "User" ADD COLUMN     "twoFactorEmail" TEXT,
ADD COLUMN     "twoFactorEmailVerified" BOOLEAN,
ADD COLUMN     "twoFactorEmailVerifyOtp" TEXT,
ADD COLUMN     "useTwoFactorEmail" BOOLEAN NOT NULL DEFAULT false;
