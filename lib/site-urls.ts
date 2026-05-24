// #lrd=PLACE_ID,1 opens the Google Maps "Write a review" panel directly.
// If NEXT_PUBLIC_GOOGLE_REVIEW_URL is set in env (recommended: use the
// "Get more reviews" short link from Google Business Profile: g.page/r/.../review),
// that takes precedence over the default constructed URL below.
export const GOOGLE_REVIEW_URL =
  process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL ||
  "https://g.page/r/CQiEjUVZv7iDEBM/review";

export const DIETITIAN_WEBSITE_URL =
  process.env.NEXT_PUBLIC_DIETITIAN_WEBSITE_URL || "https://ezgievginaktas.com";

export const REVIEW_SHARE_TEXT =
  "Ezgi Hanım ile beslenme sürecinden memnun kaldıysanız Google yorumunuz çok değerli olur. Buradan 1 dakikada yorum bırakabilirsiniz:";
