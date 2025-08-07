import { Helmet } from "react-helmet-async";

type Props = {
  title: string;
  description?: string;
  path?: string;
  noIndex?: boolean;
};

export const SEO = ({ title, description, path, noIndex }: Props) => {
  const siteName = "BuildBuddy Worker";
  const fullTitle = `${title} • ${siteName}`;
  const desc = description ?? "Mobile Worker app for BuildBuddy";
  const url = typeof window !== "undefined"
    ? `${window.location.origin}${path ?? window.location.pathname}`
    : path ?? "/";

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      {noIndex && <meta name="robots" content="noindex,nofollow" />}
      <link rel="canonical" href={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta name="twitter:card" content="summary" />
    </Helmet>
  );
};
