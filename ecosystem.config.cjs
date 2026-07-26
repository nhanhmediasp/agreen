/**
 * Cấu hình PM2 để chạy API như một service trên aaPanel.
 *
 *   npm install -g pm2
 *   pm2 start ecosystem.config.cjs
 *   pm2 save && pm2 startup      # tự khởi động lại sau khi reboot VPS
 *   pm2 logs car-rental-api      # xem log
 *
 * File dùng đuôi .cjs vì package.json khai báo "type": "module".
 */
module.exports = {
  apps: [
    {
      name: 'car-rental-api',
      script: 'server/index.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      // Tự restart nếu rò rỉ bộ nhớ vượt mức
      max_memory_restart: '400M',
      env: {
        NODE_ENV: 'production',
        TZ: 'Asia/Ho_Chi_Minh',
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
