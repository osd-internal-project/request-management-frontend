/**
 * จำนวนเงินเป็นตัวอักษรภาษาไทย ตามแบบที่ใช้บนเอกสารการค้า
 * เช่น 107000 → "หนึ่งแสนเจ็ดพันบาทถ้วน", 21.5 → "ยี่สิบเอ็ดบาทห้าสิบสตางค์".
 */
const DIGITS = ["", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
const PLACES = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"];

/**
 * 0 ≤ n < 1,000,000. `followsMillion` — หน่วยท้ายที่เป็น 1 หลัง "ล้าน" อ่าน "เอ็ด"
 * (หนึ่งล้านเอ็ด) แม้ส่วนนี้จะมีหลักเดียว.
 */
function belowMillion(n: number, followsMillion = false): string {
  const digits = String(n).split("").map(Number);
  const len = digits.length;
  let out = "";
  digits.forEach((digit, i) => {
    const place = len - i - 1;
    if (digit === 0) return;
    if (place === 1 && digit === 1) out += "สิบ";
    else if (place === 1 && digit === 2) out += "ยี่สิบ";
    else if (place === 0 && digit === 1 && (len > 1 || followsMillion))
      out += "เอ็ด";
    else out += DIGITS[digit] + PLACES[place];
  });
  return out;
}

function integerText(n: number): string {
  if (n === 0) return "ศูนย์";
  let out = "";
  const millions = Math.floor(n / 1_000_000);
  const rest = n % 1_000_000;
  if (millions > 0) out += integerText(millions) + "ล้าน";
  if (rest > 0) out += belowMillion(rest, millions > 0);
  return out;
}

export function bahtText(amount: number): string {
  if (!Number.isFinite(amount)) return "";
  const negative = amount < 0;
  // สตางค์ปัดครึ่งขึ้นที่ 2 ตำแหน่ง — ตรงกับยอดที่พิมพ์เป็นตัวเลข
  const satangTotal = Math.round(Math.abs(amount) * 100);
  const baht = Math.floor(satangTotal / 100);
  const satang = satangTotal % 100;

  const text =
    baht === 0 && satang > 0
      ? integerText(satang) + "สตางค์"
      : integerText(baht) +
        "บาท" +
        (satang === 0 ? "ถ้วน" : integerText(satang) + "สตางค์");

  return negative ? `ลบ${text}` : text;
}
