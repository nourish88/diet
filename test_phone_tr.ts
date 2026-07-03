import parsePhoneNumberFromString from "libphonenumber-js";

function normalizeClientPhoneNumber(phoneNumber: string | null): string | null {
  if (!phoneNumber) return null;
  const cleaned = phoneNumber.trim();
  let parsed = parsePhoneNumberFromString(cleaned, "TR");
  
  if (!parsed || !parsed.isValid()) {
    if (!cleaned.startsWith('+')) {
      const fallbackParsed = parsePhoneNumberFromString('+' + cleaned);
      if (fallbackParsed && fallbackParsed.isValid()) {
        parsed = fallbackParsed;
      }
    }
  }

  if (!parsed || !parsed.isValid()) return null;
  return parsed.format("E.164");
}

console.log("5333104977 ->", normalizeClientPhoneNumber("5333104977"));
console.log("05333104977 ->", normalizeClientPhoneNumber("05333104977"));
console.log("+905333104977 ->", normalizeClientPhoneNumber("+905333104977"));
console.log("491761234567 ->", normalizeClientPhoneNumber("491761234567"));
