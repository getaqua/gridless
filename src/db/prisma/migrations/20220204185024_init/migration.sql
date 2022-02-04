-- CreateEnum
CREATE TYPE "MembershipState" AS ENUM ('JOINED', 'KICKED', 'BANNED', 'LEFT');

-- CreateEnum
CREATE TYPE "ApplicationType" AS ENUM ('CLIENT', 'BOT');

-- CreateTable
CREATE TABLE "Flow" (
    "snowflake" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tagline" TEXT,
    "avatarUrl" TEXT,
    "bannerUrl" TEXT,
    "publicPermissions" JSONB NOT NULL,
    "joinedPermissions" JSONB NOT NULL,
    "parentId" TEXT,
    "owner" TEXT NOT NULL,
    "displayFlags" TEXT[],

    CONSTRAINT "Flow_pkey" PRIMARY KEY ("snowflake")
);

-- CreateTable
CREATE TABLE "FlowMember" (
    "state" "MembershipState",
    "permissions" JSONB NOT NULL,
    "owner" BOOLEAN NOT NULL DEFAULT false,
    "flowId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,

    CONSTRAINT "FlowMember_pkey" PRIMARY KEY ("flowId","memberId")
);

-- CreateTable
CREATE TABLE "User" (
    "snowflake" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "authorizedAppCIDs" TEXT[],
    "currentlyAuthorizingToken" TEXT,
    "currentlyAuthorizingScopes" TEXT[],

    CONSTRAINT "User_pkey" PRIMARY KEY ("snowflake")
);

-- CreateTable
CREATE TABLE "Content" (
    "text" TEXT,
    "originId" TEXT,
    "snowflake" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "authorId" TEXT NOT NULL,
    "inFlowId" TEXT NOT NULL,
    "anonymous" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedTimestamp" TIMESTAMP(3),

    CONSTRAINT "Content_pkey" PRIMARY KEY ("snowflake")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "filename" TEXT NOT NULL,
    "optimized_file" TEXT,
    "original_file" TEXT,
    "original_mime_type" TEXT,
    "optimized_mime_type" TEXT,
    "index" INTEGER NOT NULL,
    "user" TEXT NOT NULL,
    "app" TEXT,
    "snowflake" TEXT NOT NULL,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("snowflake")
);

-- CreateTable
CREATE TABLE "Application" (
    "snowflake" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "avatar_url" TEXT,
    "type" "ApplicationType" NOT NULL DEFAULT E'CLIENT',
    "client_id" TEXT NOT NULL,
    "redirect_uris" TEXT[],

    CONSTRAINT "Application_pkey" PRIMARY KEY ("snowflake")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "singleton" INTEGER NOT NULL DEFAULT 0,
    "auth" JSONB NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("singleton")
);

-- CreateTable
CREATE TABLE "_FollowingFlows" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_AttachmentToContent" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Flow_id_key" ON "Flow"("id");

-- CreateIndex
CREATE UNIQUE INDEX "User_id_key" ON "User"("id");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_currentlyAuthorizingToken_key" ON "User"("currentlyAuthorizingToken");

-- CreateIndex
CREATE UNIQUE INDEX "Application_client_id_key" ON "Application"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "_FollowingFlows_AB_unique" ON "_FollowingFlows"("A", "B");

-- CreateIndex
CREATE INDEX "_FollowingFlows_B_index" ON "_FollowingFlows"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_AttachmentToContent_AB_unique" ON "_AttachmentToContent"("A", "B");

-- CreateIndex
CREATE INDEX "_AttachmentToContent_B_index" ON "_AttachmentToContent"("B");

-- AddForeignKey
ALTER TABLE "Flow" ADD CONSTRAINT "Flow_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Flow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlowMember" ADD CONSTRAINT "FlowMember_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "Flow"("snowflake") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlowMember" ADD CONSTRAINT "FlowMember_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Flow"("snowflake") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_id_fkey" FOREIGN KEY ("id") REFERENCES "Flow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Content" ADD CONSTRAINT "Content_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Flow"("snowflake") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Content" ADD CONSTRAINT "Content_inFlowId_fkey" FOREIGN KEY ("inFlowId") REFERENCES "Flow"("snowflake") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Content" ADD CONSTRAINT "Content_originId_fkey" FOREIGN KEY ("originId") REFERENCES "Content"("snowflake") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FollowingFlows" ADD FOREIGN KEY ("A") REFERENCES "Flow"("snowflake") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FollowingFlows" ADD FOREIGN KEY ("B") REFERENCES "Flow"("snowflake") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AttachmentToContent" ADD FOREIGN KEY ("A") REFERENCES "Attachment"("snowflake") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AttachmentToContent" ADD FOREIGN KEY ("B") REFERENCES "Content"("snowflake") ON DELETE CASCADE ON UPDATE CASCADE;
