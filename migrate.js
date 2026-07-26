import { query } from './server/db.js';

console.log("=== BẮT ĐẦU NÂNG CẤP DATABASE ===");
query("ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS gallery_urls TEXT DEFAULT '[]';")
  .then(() => {
    console.log("✅ Thành công: Đã thêm cột gallery_urls vào bảng vehicles.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Thất bại khi nâng cấp database:", err.message || err);
    process.exit(1);
  });
