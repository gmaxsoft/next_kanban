export type AppLicense = {
  companyName: string;
  vendorName: string;
  authorName: string;
  year: number;
  notice: string;
};

function clean(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

export function getAppLicense(): AppLicense {
  const companyName = clean(
    process.env.LICENSE_COMPANY_NAME,
    "Licencjobiorca",
  );
  const vendorName = clean(process.env.LICENSE_VENDOR_NAME, "MaxSoft.pl");
  const authorName = clean(process.env.LICENSE_AUTHOR_NAME, vendorName);
  const year = Number.parseInt(process.env.LICENSE_YEAR ?? "", 10);
  const resolvedYear =
    Number.isFinite(year) && year > 2000 ? year : new Date().getFullYear();

  const customNotice = process.env.LICENSE_NOTICE?.trim();
  const notice =
    customNotice ||
    `Licencja oprogramowania Next Kanban została udzielona wyłącznie dla „${companyName}”. ` +
      `Kopiowanie, odsprzedaż lub udostępnianie poza organizacją Licencjobiorcy jest zabronione. ` +
      `Autor: ${authorName}. © ${resolvedYear} ${vendorName}. Wszelkie prawa zastrzeżone.`;

  return {
    companyName,
    vendorName,
    authorName,
    year: resolvedYear,
    notice,
  };
}
