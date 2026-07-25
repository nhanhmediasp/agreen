-- ============================================================
-- Seed Data for PostgreSQL Database (Car Rental Management)
-- Optional data population script for testing / setup
-- ============================================================

-- Seed Owners
INSERT INTO owners (id, name, phone, email, address, bank_account, bank_name, notes)
VALUES
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Nguyễn Văn An', '0901234567', 'an.nguyen@example.com', '123 Nguyễn Văn Cừ, Q.5, TP.HCM', '1903123456789', 'Techcombank', 'Chủ xe thân thiết'),
  ('a1b2c3d4-0000-0000-0000-000000000002', 'Trần Thị Bình', '0912345678', 'binh.tran@example.com', '456 Lê Văn Sỹ, Q.3, TP.HCM', '0071000123456', 'Vietcombank', 'Ký gửi 2 xe');

-- Seed Vehicles
INSERT INTO vehicles (id, plate_number, brand, model, year, color, seats, transmission, fuel_type, daily_rate, owner_id, status, current_mileage)
VALUES
  ('b1b2c3d4-0000-0000-0000-000000000001', '51F-123.45', 'Toyota', 'Vios', 2022, 'Trắng', 5, 'Automatic', 'Gasoline', 800000.00, 'a1b2c3d4-0000-0000-0000-000000000001', 'Available', 45000),
  ('b1b2c3d4-0000-0000-0000-000000000002', '30G-789.10', 'Hyundai', 'Accent', 2023, 'Đen', 5, 'Automatic', 'Gasoline', 750000.00, 'a1b2c3d4-0000-0000-0000-000000000002', 'Available', 12000),
  ('b1b2c3d4-0000-0000-0000-000000000003', '51G-001.23', 'Honda', 'CR-V', 2024, 'Đỏ', 7, 'Automatic', 'Gasoline', 1300000.00, 'a1b2c3d4-0000-0000-0000-000000000001', 'Available', 8500);

-- Seed Customers
INSERT INTO customers (id, full_name, phone, email, id_card, driver_license, address, status)
VALUES
  ('c1b2c3d4-0000-0000-0000-000000000001', 'Lê Hoàng Nam', '0987654321', 'nam.le@example.com', '079198001234', 'GPLX-12345678', '789 Điện Biên Phủ, Q.10, TP.HCM', 'Active'),
  ('c1b2c3d4-0000-0000-0000-000000000002', 'Phạm Minh Tuấn', '0978123456', 'tuan.pham@example.com', '079195009876', 'GPLX-87654321', '12 Phạm Ngọc Thạch, Q.3, TP.HCM', 'VIP');
