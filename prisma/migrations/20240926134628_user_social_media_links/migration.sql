-- CreateTable
CREATE TABLE "SocialMediaLinks" (
    "id" SERIAL NOT NULL,
    "platform" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "SocialMediaLinks_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SocialMediaLinks" ADD CONSTRAINT "SocialMediaLinks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
