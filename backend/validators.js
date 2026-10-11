const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/;
const NAME_WORD_RE = /^[А-ЯЁA-Z][а-яёa-z]+(-[А-ЯЁA-Z][а-яёa-z]+)?$/;
const BAD_WORD_RE =
  /^(?:ху[йеяию]|пизд|бляд|блят|сук[аи]$|сучк|мудак|мудил|говн|залуп|шлюх|пидор|пидар|гандон|долбоеб|ублюд|дерьм|(?:за|по|на|у|вы|съ|объ|до|от|раз)?еб(?:ан|ат|ал|ну|ут|ло|ля|аш|ыр|ис)|ебу)/;

function validateFullName(name) {
  const words = String(name || "").trim().split(/\s+/);
  if (words.length < 2 || words.length > 3) return "Укажите фамилию и имя (можно с отчеством)";
  for (const w of words) {
    if (w.length < 2 || w.length > 30 || !NAME_WORD_RE.test(w))
      return "ФИО: только буквы, каждое слово с заглавной буквы";
    if (!/[аеёиоуыэюяaeiouy]/i.test(w)) return "Введите настоящее имя";
    if (/(.)\1\1/i.test(w)) return "Введите настоящее имя";
    if (/[бвгджзйклмнпрстфхцчшщbcdfghjklmnpqrstvwxz]{5,}/i.test(w)) return "Введите настоящее имя";
  }
  return null;
}

function hasProfanity(text) {
  return String(text)
    .toLowerCase()
    .replace(/ё/g, "е")
    .split(/[^а-яa-z]+/)
    .some((w) => w && BAD_WORD_RE.test(w));
}

module.exports = { EMAIL_RE, PHONE_RE, validateFullName, hasProfanity };