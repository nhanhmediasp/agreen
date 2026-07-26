import { crudRouter } from '../lib/crud.js';
import { customerFromRow, CUSTOMER_COLUMNS } from '../lib/mappers.js';

function normalize(body) {
  const out = { ...body };
  if (out.phone !== undefined) out.phone = String(out.phone).trim();
  // activeRentals / totalRentals là field TÍNH ĐỘNG từ view -> không cho client ghi.
  delete out.activeRentals;
  delete out.totalRentals;
  return out;
}

const router = crudRouter({
  table: 'customers',
  readFrom: 'customers_with_stats',
  orderBy: 'created_at DESC, name',
  fromRow: customerFromRow,
  columns: CUSTOMER_COLUMNS,
  required: ['name', 'phone'],
  normalize,
});

export default router;
