-- CreateEnum
CREATE TYPE "MembershipState" AS ENUM ('JOINED', 'KICKED', 'BANNED', 'LEFT');

-- CreateTable
CREATE TABLE "FlowMember" (
    "state" "MembershipState",
    "permissions" JSONB NOT NULL,
    "flowId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,

    CONSTRAINT "FlowMember_pkey" PRIMARY KEY ("flowId","memberId")
);

-- AddForeignKey
ALTER TABLE "FlowMember" ADD CONSTRAINT "FlowMember_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "Flow"("snowflake") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlowMember" ADD CONSTRAINT "FlowMember_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Flow"("snowflake") ON DELETE RESTRICT ON UPDATE CASCADE;
