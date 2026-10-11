const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { Pool, types } = require("pg");
const { EMAIL_RE, PHONE_RE, validateFullName, hasProfanity } = require("./validators");

dotenv.config();

types.setTypeParser(1700, (v) => parseFloat(v));
types.setTypeParser(20, (v) => parseInt(v, 10));
types.setTypeParser(1082, (v) => v);

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_fankit";
const MAX_QTY = 10;
const WELCOME_PERCENT = 10;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

const fail = (status, message) => {
  const e = new Error(message);
  e.status = status;
  return e;
};

const wrap = (fn) => (req, res) =>
  fn(req, res).catch((err) => {
    if (err.status) return res.status(err.status).json({ message: err.message });
    const map = {
      "23505": [409, "Такая запись уже существует"],
      "23503": [400, "Связанная запись не найдена"],
      "23514": [400, "Данные не прошли проверку"],
    };
    if (map[err.code]) return res.status(map[err.code][0]).json({ message: map[err.code][1] });
    console.error(err);
    res.status(500).json({ message: "Ошибка сервера" });
  });

const passwordResetCodes = new Map();
const round2 = (n) => Math.round(n * 100) / 100;
const idParam = (req, name = "id") => {
  const n = Number(req.params[name]);
  if (!Number.isInteger(n) || n < 1) throw fail(400, "Некорректный запрос");
  return n;
};

const USER_SELECT = `
  SELECT u.user_id, u.full_name, u.email, u.phone, u.default_address,
         u.discount_coupon, u.discount_percent, u.welcome_used, r.name AS role
  FROM users u JOIN roles r ON r.role_id = u.role_id`;

async function issueSession(userId) {
  const { rows } = await pool.query(`${USER_SELECT} WHERE u.user_id = $1`, [userId]);
  const user = rows[0];
  const token = jwt.sign({ user_id: user.user_id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
  return { token, user };
}

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Требуется авторизация" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Сессия истекла" });
  }
}

const adminOnly = (req, res, next) =>
  req.user.role === "admin" ? next() : res.status(403).json({ message: "Доступ запрещён" });
const buyerOnly = (req, res, next) =>
  req.user.role === "user" ? next() : res.status(403).json({ message: "Действие доступно только покупателям" });

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.post("/api/auth/register", wrap(async (req, res) => {
  const { full_name, email, password, phone } = req.body || {};
  const nameErr = validateFullName(full_name);
  if (nameErr) throw fail(400, nameErr);
  if (!EMAIL_RE.test(email || "")) throw fail(400, "Некорректный email");
  if (!password || password.length < 6) throw fail(400, "Пароль от 6 символов");
  if (!PHONE_RE.test(phone || "")) throw fail(400, "Телефон в формате +7 (900) 123-45-67");

  const mail = email.toLowerCase();
  const exists = await pool.query("SELECT 1 FROM users WHERE email = \$1", [mail]);
  if (exists.rowCount) throw fail(409, "Пользователь с таким email уже существует");

  const hash = await bcrypt.hash(password, 10);
  const ins = await pool.query(
    `INSERT INTO users (role_id, full_name, email, password, phone)
     VALUES ((SELECT role_id FROM roles WHERE name = 'user'), $1, $2, $3, $4) RETURNING user_id`,
    [full_name.trim().replace(/\s+/g, " "), mail, hash, phone]
  );
  res.status(201).json(await issueSession(ins.rows[0].user_id));
}));

app.post("/api/auth/login", wrap(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) throw fail(400, "Заполните email и пароль");
  const r = await pool.query("SELECT user_id, password FROM users WHERE email = \$1", [String(email).toLowerCase()]);
  if (!r.rowCount || !(await bcrypt.compare(String(password), r.rows[0].password)))
    throw fail(401, "Неверный email или пароль");
  res.json(await issueSession(r.rows[0].user_id));
}));

app.post("/api/auth/forgot-password", wrap(async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) throw fail(400, "Некорректный email");

  passwordResetCodes.delete(email);
  const exists = await pool.query("SELECT user_id FROM users WHERE email = \$1", [email]);
  if (!exists.rowCount) {
    return res.json({ message: "Если аккаунт существует, код отправлен на email" });
  }

  const host = process.env.SMTP_HOST;
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  if (!host || !from) throw fail(503, "Отправка email не настроена на сервере");

  const code = String(crypto.randomInt(100000, 1000000));
  const codeHash = crypto.createHmac("sha256", JWT_SECRET).update(`${email}:${code}`).digest("hex");
  const transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER && process.env.SMTP_PASSWORD
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });
  try {
    await transporter.sendMail({
      from,
      to: email,
      subject: "Код для сброса пароля",
      text: `Код для сброса пароля: ${code}. Он действителен 10 минут.`,
    });
  } catch {
    console.error("Не удалось отправить письмо для сброса пароля");
    throw fail(503, "Не удалось отправить письмо с кодом");
  }

  passwordResetCodes.set(email, { codeHash, expiresAt: Date.now() + 10 * 60 * 1000 });
  res.json({ message: "Если аккаунт существует, код отправлен на email" });
}));

app.post("/api/auth/reset-password", wrap(async (req, res) => {
  const { email, code, password } = req.body || {};
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanCode = String(code || "").trim();

  if (!EMAIL_RE.test(cleanEmail)) throw fail(400, "Некорректный email");
  if (!cleanCode || cleanCode.length !== 6) throw fail(400, "Неверный код сброса");
  if (!password || String(password).length < 6) throw fail(400, "Пароль должен быть от 6 символов");

  const stored = passwordResetCodes.get(cleanEmail);
  const codeHash = crypto.createHmac("sha256", JWT_SECRET).update(`${cleanEmail}:${cleanCode}`).digest("hex");
  if (
    !stored
    || stored.codeHash.length !== codeHash.length
    || !crypto.timingSafeEqual(Buffer.from(stored.codeHash), Buffer.from(codeHash))
    || Date.now() > stored.expiresAt
  ) {
    throw fail(400, "Неверный или просроченный код");
  }

  const hash = await bcrypt.hash(String(password), 10);
  await pool.query("UPDATE users SET password = \$1 WHERE email = \$2", [hash, cleanEmail]);
  passwordResetCodes.delete(cleanEmail);
  res.json({ message: "Пароль успешно изменён" });
}));

app.get("/api/auth/me", auth, wrap(async (req, res) => {
  const { rows } = await pool.query(`${USER_SELECT} WHERE u.user_id = $1`, [req.user.user_id]);
  if (!rows.length) throw fail(401, "Пользователь не найден");
  res.json(rows[0]);
}));

app.put("/api/profile", auth, wrap(async (req, res) => {
  const { full_name, email, phone, default_address } = req.body || {};
  const isAdmin = req.user.role === "admin";
  if (req.body?.user_id && Number(req.body.user_id) !== req.user.user_id) {
    throw fail(403, "Администратор не может изменять данные пользователей");
  }
  const nameErr = validateFullName(full_name);
  if (nameErr) throw fail(400, nameErr);
  if (!EMAIL_RE.test(email || "")) throw fail(400, "Некорректный email");
  if ((!isAdmin || phone) && !PHONE_RE.test(phone || "")) throw fail(400, "Телефон в формате +7 (900) 123-45-67");
  const dup = await pool.query("SELECT 1 FROM users WHERE email = \$1 AND user_id <> \$2", [email.toLowerCase(), req.user.user_id]);
  if (dup.rowCount) throw fail(409, "Email уже занят");
  await pool.query(
    "UPDATE users SET full_name = \$1, email = \$2, phone = \$3, default_address = \$4 WHERE user_id = \$5",
    [full_name.trim().replace(/\s+/g, " "), email.toLowerCase(), phone || null, isAdmin ? null : String(default_address || "").trim() || null, req.user.user_id]
  );
  const { rows } = await pool.query(`${USER_SELECT} WHERE u.user_id = $1`, [req.user.user_id]);
  res.json(rows[0]);
}));

app.delete("/api/users/:id", auth, adminOnly, wrap(async (req, res) => {
  throw fail(403, "Администратор не может удалять пользователей");
}));

app.put("/api/users/:id", auth, adminOnly, wrap(async (req, res) => {
  throw fail(403, "Администратор не может изменять данные пользователей");
}));

app.get("/api/categories", wrap(async (req, res) => {
  const r = await pool.query("SELECT category_id, name, is_default FROM categories ORDER BY is_default, category_id");
  res.json(r.rows);
}));

app.post("/api/categories", auth, adminOnly, wrap(async (req, res) => {
  const name = String(req.body.name || "").trim();
  if (name.length < 2) throw fail(400, "Название категории: от 2 символов");
  const r = await pool.query("INSERT INTO categories (name) VALUES (\$1) RETURNING category_id, name, is_default", [name]);
  res.status(201).json(r.rows[0]);
}));

app.delete("/api/categories/:id", auth, adminOnly, wrap(async (req, res) => {
  const categoryId = idParam(req, "id");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const category = await client.query(
      "SELECT category_id, name, is_default FROM categories WHERE category_id = \$1 FOR UPDATE",
      [categoryId]
    );
    if (!category.rowCount) throw fail(404, "Категория не найдена");
    if (category.rows[0].is_default || category.rows[0].name === "Без категории") {
      throw fail(400, "Нельзя удалить нейтральную категорию");
    }

    let neutral = await client.query(
      "SELECT category_id FROM categories WHERE is_default = TRUE FOR UPDATE"
    );
    if (!neutral.rowCount) {
      neutral = await client.query("SELECT category_id FROM categories WHERE name = \$1 FOR UPDATE", ["Без категории"]);
      if (neutral.rowCount) {
        neutral = await client.query(
          "UPDATE categories SET is_default = TRUE WHERE category_id = \$1 RETURNING category_id",
          [neutral.rows[0].category_id]
        );
      } else {
        neutral = await client.query(
          "INSERT INTO categories (name, is_default) VALUES (\$1, TRUE) RETURNING category_id",
          ["Без категории"]
        );
      }
    }

    await client.query("UPDATE products SET category_id = \$1 WHERE category_id = \$2", [neutral.rows[0].category_id, categoryId]);
    await client.query("DELETE FROM categories WHERE category_id = \$1", [categoryId]);
    await client.query("COMMIT");
    res.json({ message: "Категория удалена. Товары перенесены в \"Без категории\"" });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}));

const FINAL_PRICE = `ROUND(p.price * (100 - CASE WHEN p.has_discount THEN p.discount_percent ELSE 0 END) / 100.0, 2)`;
const PRODUCT_SELECT = `
  SELECT p.product_id, p.name, p.description, p.duration_days, p.price, p.image_url,
         p.has_discount, p.discount_percent, p.category_id, c.name AS category_name,
         ${FINAL_PRICE} AS final_price,
         ROUND(COALESCE(AVG(r.rating) FILTER (WHERE NOT r.removed_by_admin), 0), 1) AS avg_rating,
         COUNT(r.review_id) FILTER (WHERE NOT r.removed_by_admin) AS reviews_count
  FROM products p
  JOIN categories c ON c.category_id = p.category_id
  LEFT JOIN reviews r ON r.product_id = p.product_id`;
const PRODUCT_GROUP = `GROUP BY p.product_id, c.category_id`;

app.get("/api/products", wrap(async (req, res) => {
  const r = await pool.query(`${PRODUCT_SELECT} ${PRODUCT_GROUP} ORDER BY p.product_id`);
  res.json(r.rows);
}));

const CART_SELECT = `
  SELECT ci.quantity, p.product_id, p.name, p.image_url, p.price, ${FINAL_PRICE} AS final_price,
         p.has_discount, p.discount_percent, c.name AS category_name
  FROM cart_items ci
  JOIN products p ON p.product_id = ci.product_id
  JOIN categories c ON c.category_id = p.category_id
  WHERE ci.user_id = $1 ORDER BY ci.cart_item_id`;

function calcTotals(user, items) {
  const subtotal = round2(items.reduce((s, i) => s + i.final_price * i.quantity, 0));
  const welcome = user.welcome_used ? 0 : WELCOME_PERCENT;
  const personal = user.discount_percent || 0;
  const percent = Math.max(welcome, personal);
  const usesWelcome = welcome > personal;
  const label = percent === 0 ? null : usesWelcome ? "Скидка на первый заказ" : `Купон ${user.discount_coupon || "скидка"}`;
  const discountAmount = round2((subtotal * percent) / 100);
  return { subtotal, discount_percent: percent, discount_label: label, uses_welcome: usesWelcome, discount_amount: discountAmount, total: round2(subtotal - discountAmount) };
}

async function sendCart(res, userId) {
  const user = (await pool.query(`${USER_SELECT} WHERE u.user_id = $1`, [userId])).rows[0];
  const items = (await pool.query(CART_SELECT, [userId])).rows;
  const { uses_welcome, ...totals } = calcTotals(user, items);
  res.json({ items, ...totals });
}

app.get("/api/cart", auth, buyerOnly, wrap(async (req, res) => sendCart(res, req.user.user_id)));

app.post("/api/cart", auth, buyerOnly, wrap(async (req, res) => {
  const productId = Number(req.body.product_id);
  const qty = Number(req.body.quantity || 1);
  if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) throw fail(400, `Количество: от 1 до ${MAX_QTY}`);
  const p = await pool.query("SELECT 1 FROM products WHERE product_id = \$1", [productId]);
  if (!p.rowCount) throw fail(404, "Товар не найден");
  await pool.query(
    `INSERT INTO cart_items (user_id, product_id, quantity) VALUES ($1,$2,$3)
     ON CONFLICT (user_id, product_id) DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity`,
    [req.user.user_id, productId, qty]
  );
  await sendCart(res, req.user.user_id);
}));

app.patch("/api/cart/:productId", auth, buyerOnly, wrap(async (req, res) => {
  const qty = Number(req.body.quantity);
  if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) throw fail(400, `Количество: от 1 до ${MAX_QTY}`);
  await pool.query("UPDATE cart_items SET quantity = \$1 WHERE user_id = \$2 AND product_id = \$3", [qty, req.user.user_id, idParam(req, "productId")]);
  await sendCart(res, req.user.user_id);
}));

app.delete("/api/cart/:productId", auth, buyerOnly, wrap(async (req, res) => {
  await pool.query("DELETE FROM cart_items WHERE user_id = \$1 AND product_id = \$2", [req.user.user_id, idParam(req, "productId")]);
  await sendCart(res, req.user.user_id);
}));

const ORDER_SELECT = `
  SELECT o.order_id, o.address, o.delivery_date, o.subtotal, o.discount_amount, o.total, o.status, o.created_at,
         u.full_name AS customer_name, u.email AS customer_email, pay.status AS payment_status,
         COALESCE(json_agg(json_build_object('name', oi.product_name, 'unit_price', oi.unit_price, 'quantity', oi.quantity)
                  ORDER BY oi.order_item_id) FILTER (WHERE oi.order_item_id IS NOT NULL), '[]') AS items
  FROM orders o
  JOIN users u ON u.user_id = o.user_id
  LEFT JOIN payments pay ON pay.order_id = o.order_id
  LEFT JOIN order_items oi ON oi.order_id = o.order_id`;
const ORDER_GROUP = `GROUP BY o.order_id, u.user_id, pay.payment_id`;

app.post("/api/orders", auth, buyerOnly, wrap(async (req, res) => {
  const address = String(req.body.address || "").trim();
  
  // Принимаем дату в любом формате (delivery_date, deliveryDate, date)
  const rawDate = req.body.delivery_date || req.body.deliveryDate || req.body.date || "";
  const date = String(rawDate).split("T")[0].trim();
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!dateMatch) throw fail(400, "Укажите корректную дату доставки");
  const [, year, month, day] = dateMatch;
  const parsedDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    parsedDate.getUTCFullYear() !== Number(year)
    || parsedDate.getUTCMonth() !== Number(month) - 1
    || parsedDate.getUTCDate() !== Number(day)
  ) {
    throw fail(400, "Укажите корректную дату доставки");
  }
  if (date < new Date().toISOString().slice(0, 10)) {
    throw fail(400, "Дата доставки не может быть раньше сегодняшнего дня");
  }

  if (address.length < 10) throw fail(400, "Укажите полный адрес (от 10 символов)");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const uid = req.user.user_id;
    const user = (await client.query(`${USER_SELECT} WHERE u.user_id = $1 FOR UPDATE OF u`, [uid])).rows[0];
    const items = (await client.query(CART_SELECT, [uid])).rows;
    if (!items.length) throw fail(400, "Корзина пуста");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`delivery:${date}`]);
    const booked = await client.query(
      `SELECT COALESCE(SUM(oi.quantity), 0) AS quantity
       FROM order_items oi
       JOIN orders o ON o.order_id = oi.order_id
       WHERE o.delivery_date = $1 AND o.status IS DISTINCT FROM 'Отменён'`,
      [date]
    );
    const requestedQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const remaining = MAX_QTY - Number(booked.rows[0].quantity);
    if (requestedQuantity > remaining) {
      throw fail(409, `На выбранную дату осталось мест: ${Math.max(remaining, 0)}. Выберите другую дату или уменьшите количество`);
    }
    const t = calcTotals(user, items);

    const order = (await client.query(
      `INSERT INTO orders (user_id, address, delivery_date, subtotal, discount_amount, total)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING order_id`,
      [uid, address, date, t.subtotal, t.discount_amount, t.total]
    )).rows[0];
    for (const i of items) {
      await client.query(
        "INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity) VALUES (\$1,\$2,\$3,\$4,\$5)",
        [order.order_id, i.product_id, i.name, i.final_price, i.quantity]
      );
    }
    await client.query("INSERT INTO payments (order_id, user_id, amount) VALUES (\$1,\$2,\$3)", [order.order_id, uid, t.total]);
    await client.query("DELETE FROM cart_items WHERE user_id = \$1", [uid]);
    if (t.uses_welcome) await client.query("UPDATE users SET welcome_used = TRUE WHERE user_id = \$1", [uid]);
    await client.query("COMMIT");
    res.status(201).json({ order_id: order.order_id, total: t.total });
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}));

app.get("/api/orders/my", auth, buyerOnly, wrap(async (req, res) => {
  const r = await pool.query(`${ORDER_SELECT} WHERE o.user_id = $1 ${ORDER_GROUP} ORDER BY o.created_at DESC`, [req.user.user_id]);
  res.json(r.rows);
}));

app.patch("/api/orders/:id/status", auth, adminOnly, wrap(async (req, res) => {
  const orderId = idParam(req, "id");
  const nextStatus = String(req.body?.status || "").trim();
  const allowed = ["Ожидает оплаты", "Оплачен", "В обработке", "Отменён", "Доставляется"];
  if (!allowed.includes(nextStatus)) throw fail(400, "Некорректный статус заказа");

  const updated = await pool.query(
    `UPDATE orders SET status = $1
     WHERE order_id = $2
       AND NOT (status = 'Оплачен' AND $1 = 'Ожидает оплаты')
     RETURNING order_id`,
    [nextStatus, orderId]
  );
  if (!updated.rowCount) {
    const exists = await pool.query("SELECT 1 FROM orders WHERE order_id = $1", [orderId]);
    if (!exists.rowCount) throw fail(404, "Заказ не найден");
    throw fail(400, "Нельзя вернуть оплаченный заказ в статус \"Ожидает оплаты\"");
  }
  res.json({ message: "Статус заказа обновлён" });
}));

app.post("/api/orders/:id/pay", auth, buyerOnly, wrap(async (req, res) => {
  const orderId = idParam(req);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const order = await client.query(
      `UPDATE orders SET status = 'Оплачен'
       WHERE order_id = $1 AND user_id = $2 AND status = 'Ожидает оплаты'
       RETURNING order_id`,
      [orderId, req.user.user_id]
    );
    if (!order.rowCount) throw fail(409, "Заказ не найден или уже оплачен");
    const payment = await client.query(
      `UPDATE payments SET status = 'Оплачен', payment_date = NOW()
       WHERE order_id = $1 AND user_id = $2
       RETURNING payment_id`,
      [orderId, req.user.user_id]
    );
    if (!payment.rowCount) throw fail(409, "Не найдена запись оплаты заказа");
    await client.query("COMMIT");
    res.json({ message: "Заказ оплачен" });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}));


app.post("/api/profile/change-password", auth, wrap(async (req, res) => {
  const { current_password, new_password } = req.body || {};
  if (!current_password || !new_password) throw fail(400, "Заполните все поля");
  if (new_password.length < 6) throw fail(400, "Новый пароль должен быть от 6 символов");

  const r = await pool.query("SELECT password FROM users WHERE user_id = \$1", [req.user.user_id]);
  if (!r.rowCount || !(await bcrypt.compare(current_password, r.rows[0].password))) {
    throw fail(400, "Неверный текущий пароль");
  }

  const hash = await bcrypt.hash(new_password, 10);
  await pool.query("UPDATE users SET password = \$1 WHERE user_id = \$2", [hash, req.user.user_id]);
  res.json({ message: "Пароль успешно изменён" });
}));


app.get("/api/products/:id/reviews", wrap(async (req, res) => {
  const pid = idParam(req, "id");
  const r = await pool.query(
    `SELECT rev.review_id, rev.rating,
            CASE WHEN rev.removed_by_admin THEN 'Администратор удалил отзыв за нарушение политики' ELSE rev.comment END AS comment,
            rev.removed_by_admin, rev.created_at, u.full_name AS author_name, rev.user_id
     FROM reviews rev
     JOIN users u ON u.user_id = rev.user_id
     WHERE rev.product_id = $1
     ORDER BY rev.created_at DESC`,
    [pid]
  );
  res.json(r.rows);
}));


app.post("/api/products/:id/reviews", auth, wrap(async (req, res) => {
  const pid = idParam(req, "id");
  const rating = Number(req.body.rating);
  const comment = String(req.body.comment || "").trim();

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw fail(400, "Оценка должна быть от 1 до 5");
  }
  if (!comment || comment.length < 3) throw fail(400, "Напишите текст отзыва");
  if (hasProfanity(comment)) throw fail(400, "Отзыв не может содержать мат и нецензурную лексику");

  const r = await pool.query(
    `INSERT INTO reviews (product_id, user_id, rating, comment)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, product_id)
     DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, created_at = NOW()
     RETURNING review_id, rating, comment, created_at`,
    [pid, req.user.user_id, rating, comment]
  );
  res.status(201).json(r.rows[0]);
}));

app.delete("/api/products/:id/reviews/:reviewId", auth, adminOnly, wrap(async (req, res) => {
  const productId = idParam(req, "id");
  const reviewId = idParam(req, "reviewId");
  const result = await pool.query(
    "UPDATE reviews SET removed_by_admin = TRUE WHERE review_id = \$1 AND product_id = \$2 RETURNING review_id",
    [reviewId, productId]
  );
  if (!result.rowCount) throw fail(404, "Отзыв не найден");
  res.json({ message: "Отзыв удалён за нарушение политики" });
}));

app.delete("/api/products/:id", auth, adminOnly, wrap(async (req, res) => {
  const pid = idParam(req, "id");
  await pool.query("DELETE FROM products WHERE product_id = \$1", [pid]);
  res.json({ message: "Товар удалён" });
}));


app.post("/api/products", auth, adminOnly, wrap(async (req, res) => {
  const { category_id, name, description, price, duration_days, image_url } = req.body || {};
  if (!name || name.trim().length < 2) throw fail(400, "Укажите название товара");
  if (!price || Number(price) <= 0) throw fail(400, "Укажите корректную цену");

  const r = await pool.query(
    `INSERT INTO products (category_id, name, description, price, duration_days, image_url)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [Number(category_id) || 1, name.trim(), description || "", Number(price), Number(duration_days) || 3, image_url || null]
  );
  res.status(201).json(r.rows[0]);
})); 

app.listen(PORT, () => console.log(`Backend run on http://localhost:${PORT}`));