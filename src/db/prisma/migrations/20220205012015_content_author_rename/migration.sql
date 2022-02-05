/*
  Warnings:

  - You are about to drop the column `authorMemberId` on the `Content` table. All the data in the column will be lost.
  - Added the required column `authorId` to the `Content` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Content" DROP CONSTRAINT "Content_inFlowId_authorMemberId_fkey";

-- AlterTable
ALTER TABLE "Content" DROP COLUMN "authorMemberId",
ADD COLUMN     "authorId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Content" ADD CONSTRAINT "Content_inFlowId_authorId_fkey" FOREIGN KEY ("inFlowId", "authorId") REFERENCES "FlowMember"("flowId", "memberId") ON DELETE SET NULL ON UPDATE CASCADE;
