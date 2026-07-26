import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import pool, { query } from '../db.js';
import { randomId } from '../lib/ids.js';
import { seedBaseData, generateDemoDataset } from '../lib/demoData.js';

/**
 *   npm run db:seed        -> tài khoản admin + dữ liệu khởi tạo nhỏ
 *   npm run db:seed:demo   -> thêm bộ dữ liệu lớn (50 xe / 500 đơn) để test
 *
 * Mật khẩu admin lấy từ biến môi trường ADMIN_PASSWORD; nếu không có thì
 * sinh ngẫu nhiên và IN RA MỘT LẦN — không còn mật khẩu mặc định cắm cứng
 * trong source code như 'agreen2024'.
 */
async function ensureAdmin() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const { rows } = await query(`SELECT id, username FROM users WHERE username = $1`, [username]);

  if (rows[0]) {
    console.log(`[seed] Tài khoản '${username}' đã tồn tại — giữ nguyên mật khẩu hiện tại.`);
    return;
  }

  const generated = !process.env.ADMIN_PASSWORD;
  const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(9).toString('base64url');
  const hash = await bcrypt.hash(password, 12);

  await query(
    `INSERT INTO users (id, username, password_hash, full_name, role) VALUES ($1,$2,$3,$4,'admin')`,
    [randomId(), username, hash, process.env.ADMIN_FULL_NAME || 'Quản trị viên']
  );

  console.log('\n========================================================');
  console.log(`[seed] ✅ Đã tạo tài khoản quản trị`);
  console.log(`       Tên đăng nhập : ${username}`);
  if (generated) {
    console.log(`       Mật khẩu      : ${password}`);
    console.log('       ⚠  Mật khẩu này CHỈ hiện một lần. Hãy lưu lại ngay,');
    console.log('          hoặc đổi trong app sau khi đăng nhập.');
  } else {
    console.log('       Mật khẩu      : (lấy từ biến ADMIN_PASSWORD trong .env)');
  }
  console.log('========================================================\n');
}

async function main() {
  const withDemo = process.argv.includes('--demo');

  await ensureAdmin();

  if (withDemo) {
    console.log('[seed] Đang sinh bộ dữ liệu lớn (có thể mất 10–30 giây)...');
    const summary = await generateDemoDataset();
    console.log('[seed] ✅ Dữ liệu demo:', summary);
  } else {
    const summary = await seedBaseData({ truncate: false });
    console.log('[seed] ✅ Dữ liệu khởi tạo:', summary);
  }
}

main()
  .catch((err) => {
    console.error('[seed] ❌ Lỗi:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
