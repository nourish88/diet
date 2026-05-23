// #lrd=PLACE_ID,1 opens the Google Maps "Write a review" panel directly.
// If NEXT_PUBLIC_GOOGLE_REVIEW_URL is set in env (recommended: use the
// "Get more reviews" short link from Google Business Profile: g.page/r/.../review),
// that takes precedence over the default constructed URL below.
export const GOOGLE_REVIEW_URL =
  process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL ||
  "https://www.google.com/maps/place/Diyetisyen+Ezgi+Evgin/@39.9669753,32.6332346,17z/data=!3m1!4b1!4m6!3m5!1s0x14d330d2f71d4659:0x83b8bf59458d8408!8m2!3d39.9669753!4d32.6358095!16s%2Fg%2F11dymr8nhs#lrd=0x14d330d2f71d4659:0x83b8bf59458d8408,1";

export const DIETITIAN_WEBSITE_URL =
  process.env.NEXT_PUBLIC_DIETITIAN_WEBSITE_URL || "https://ezgievginaktas.com";
