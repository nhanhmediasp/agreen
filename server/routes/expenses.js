import { crudRouter } from '../lib/crud.js';
import { badRequest } from '../lib/http.js';
import { expenseFromRow, EXPENSE_COLUMNS } from '../lib/mappers.js';

function normalize(body) {
  const out = { ...body };
  if (out.amount !== undefined) {
    const n = Number(out.amount);
    if (Number.isNaN(n) || n < 0) throw badRequest('Số tiền chi phí không hợp lệ.');
    out.amount = Math.round(n);
  }
  if (out.date !== undefined && !out.date) {
    throw badRequest('Vui lòng chọn ngày phát sinh chi phí.');
  }
  return out;
}

const router = crudRouter({
  table: 'expenses',
  orderBy: 'date DESC, created_at DESC',
  fromRow: expenseFromRow,
  columns: EXPENSE_COLUMNS,
  required: ['title', 'date'],
  normalize,
});

export default router;
