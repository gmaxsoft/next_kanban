ALTER TABLE `Task`
  ADD COLUMN `requestedBy` VARCHAR(255) NULL;

ALTER TABLE `Ticket`
  ADD COLUMN `requestedBy` VARCHAR(255) NULL;

UPDATE `Ticket`
SET `requestedBy` = COALESCE(NULLIF(`requesterName`, ''), `requesterEmail`)
WHERE `requestedBy` IS NULL;

UPDATE `Task` AS t
JOIN `User` AS u ON u.`id` = t.`createdById`
SET t.`requestedBy` = u.`name`
WHERE t.`requestedBy` IS NULL;
