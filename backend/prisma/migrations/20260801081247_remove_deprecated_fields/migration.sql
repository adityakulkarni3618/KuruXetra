/*
  Warnings:

  - You are about to drop the column `collegeId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `division` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `emergencyContact` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "collegeId",
DROP COLUMN "division",
DROP COLUMN "emergencyContact";
