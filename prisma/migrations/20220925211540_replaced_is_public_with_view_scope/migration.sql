/*
  Warnings:

  - You are about to drop the column `isPublic` on the `recipes` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `recipes` DROP COLUMN `isPublic`,
    ADD COLUMN `viewScope` VARCHAR(191) NOT NULL DEFAULT 'PUBLIC';
