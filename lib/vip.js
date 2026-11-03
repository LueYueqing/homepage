import crypto from 'crypto';
import { getPool } from './db';

export const FREE_UPLOAD_LIMIT = 20;
export const VIP_UPLOAD_LIMIT = 100;
export const VIP_PRICE_FEN = 500;
export const VIP_PRICE_YUAN = '5.00';

let schemaReady;

export function isVipUntil(value) {
  if (!value) return false;
  const time = value instanceof Date ? value.getTime() : Date.parse(String(value).replace(' ', 'T'));
  return Number.isFinite(time) && time > Date.now();
}

export function uploadLimitFor(vipUntil) {
  return isVipUntil(vipUntil) ? VIP_UPLOAD_LIMIT : FREE_UPLOAD_LIMIT;
}

export function formatVipDate(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export async function ensureVipSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const pool = getPool();
      const [columns] = await pool.query(
        `SELECT COUNT(*) AS total
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'vip_until'`,
      );
      if (!Number(columns[0].total)) {
        await pool.query('ALTER TABLE users ADD COLUMN vip_until DATETIME NULL');
      }
      await pool.query(`
        CREATE TABLE IF NOT EXISTS vip_orders (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          user_id BIGINT UNSIGNED NOT NULL,
          out_trade_no VARCHAR(32) NOT NULL,
          provider VARCHAR(16) NOT NULL,
          amount_fen INT UNSIGNED NOT NULL,
          status VARCHAR(16) NOT NULL DEFAULT 'pending',
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          paid_at DATETIME NULL,
          PRIMARY KEY (id),
          UNIQUE KEY uniq_out_trade_no (out_trade_no),
          KEY idx_user_status (user_id, status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

export async function createVipOrder(userId, provider) {
  if (provider !== 'wechat' && provider !== 'alipay') {
    const error = new Error('请选择微信或支付宝');
    error.status = 400;
    throw error;
  }
  await ensureVipSchema();
  const outTradeNo = `${provider === 'wechat' ? 'W' : 'A'}${crypto.randomBytes(12).toString('hex')}`.slice(0, 32);
  const pool = getPool();
  await pool.query(
    `INSERT INTO vip_orders (user_id, out_trade_no, provider, amount_fen, status)
     VALUES (?, ?, ?, ?, 'pending')`,
    [userId, outTradeNo, provider, VIP_PRICE_FEN],
  );
  return { outTradeNo, amountFen: VIP_PRICE_FEN };
}

export async function vipOrderForUser(userId, outTradeNo) {
  await ensureVipSchema();
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT o.status, o.paid_at, u.vip_until
     FROM vip_orders o
     JOIN users u ON u.id = o.user_id
     WHERE o.user_id = ? AND o.out_trade_no = ?
     LIMIT 1`,
    [userId, outTradeNo],
  );
  if (!rows.length) return null;
  return {
    status: rows[0].status,
    is_vip: isVipUntil(rows[0].vip_until),
    vip_until: formatVipDate(rows[0].vip_until),
    upload_limit: uploadLimitFor(rows[0].vip_until),
  };
}

export async function markVipPaid(outTradeNo, provider, amountFen) {
  if (Number(amountFen) !== VIP_PRICE_FEN) return false;
  await ensureVipSchema();
  const pool = getPool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [orders] = await connection.query(
      `SELECT id, user_id, amount_fen, status
       FROM vip_orders
       WHERE out_trade_no = ? AND provider = ?
       LIMIT 1
       FOR UPDATE`,
      [outTradeNo, provider],
    );
    if (!orders.length || Number(orders[0].amount_fen) !== VIP_PRICE_FEN) {
      await connection.rollback();
      return false;
    }
    if (orders[0].status !== 'paid') {
      await connection.query(
        `UPDATE users
         SET vip_until = DATE_ADD(GREATEST(IFNULL(vip_until, NOW()), NOW()), INTERVAL 1 YEAR)
         WHERE id = ?`,
        [orders[0].user_id],
      );
      await connection.query(
        `UPDATE vip_orders SET status = 'paid', paid_at = NOW() WHERE id = ?`,
        [orders[0].id],
      );
    }
    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
