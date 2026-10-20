ALTER TABLE `Team`
    ADD COLUMN `imapAllowedSenderDomains` VARCHAR(2000) NOT NULL DEFAULT 'pwginfo.pl';
