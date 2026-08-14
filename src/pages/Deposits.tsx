import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Empty, Statistic } from 'antd';
import {
  Bike,
  CircleCheck,
  CircleDollarSign,
  Clock3,
  Eye,
  Search,
  WalletCards,
} from 'lucide-react';
import { useApp, type Rental } from '../context/AppContext';
import { Pagination } from '../components/Pagination';

type DepositStatusFilter = 'all' | NonNullable<Rental['depositStatus']>;
type DepositMethodFilter = 'all' | NonNullable<Rental['depositType']>;

const depositStatusOf = (rental: Rental): NonNullable<Rental['depositStatus']> => (
  rental.depositStatus ?? 'received'
);

const depositMethodOf = (rental: Rental): NonNullable<Rental['depositType']> => (
  rental.depositType ?? 'cash'
);

const rentalStatusLabel: Record<Rental['status'], string> = {
  pending: 'Chờ bàn giao',
  active: 'Đang thuê',
  completed: 'Đã hoàn tất',
  cancelled: 'Đã huỷ',
};

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('vi-VN');
};

const depositDescription = (rental: Rental) => {
  if (depositMethodOf(rental) === 'cash') {
    return `${Number(rental.deposit || 0).toLocaleString('vi-VN')} ₫`;
  }

  const vehicle = rental.depositVehicle;
  const detail = [vehicle?.brand, vehicle?.model, vehicle?.color].filter(Boolean).join(' · ');
  return `${vehicle?.plate || 'Chưa có biển số'}${detail ? ` — ${detail}` : ''}`;
};

const Deposits = () => {
  const { rentals, updateRental } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<DepositStatusFilter>('all');
  const [methodFilter, setMethodFilter] = useState<DepositMethodFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [savingRentalId, setSavingRentalId] = useState<string | null>(null);
  const itemsPerPage = 10;

  const filteredRentals = useMemo(() => {
    const keyword = searchTerm.trim().toLocaleLowerCase('vi');
    return rentals.filter(rental => {
      const vehicle = rental.depositVehicle;
      const matchesSearch = !keyword || [
        rental.id,
        rental.customerName,
        rental.customerPhone,
        rental.carId,
        vehicle?.plate,
        vehicle?.brand,
        vehicle?.model,
      ].some(value => value?.toLocaleLowerCase('vi').includes(keyword));
      const matchesStatus = statusFilter === 'all' || depositStatusOf(rental) === statusFilter;
      const matchesMethod = methodFilter === 'all' || depositMethodOf(rental) === methodFilter;
      return matchesSearch && matchesStatus && matchesMethod;
    });
  }, [methodFilter, rentals, searchTerm, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [methodFilter, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRentals.length / itemsPerPage));
  const paginatedRentals = filteredRentals.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const receivedCount = rentals.filter(rental => depositStatusOf(rental) === 'received').length;
  const pendingCount = rentals.filter(rental => depositStatusOf(rental) === 'pending').length;
  const heldCash = rentals
    .filter(rental => (
      depositStatusOf(rental) === 'received'
      && depositMethodOf(rental) === 'cash'
      && !rental.depositReturnedAt
      && rental.status !== 'cancelled'
    ))
    .reduce((sum, rental) => sum + Number(rental.deposit || 0), 0);
  const heldVehicles = rentals.filter(rental => (
    depositStatusOf(rental) === 'received'
    && depositMethodOf(rental) === 'motorbike'
    && !rental.depositReturnedAt
    && rental.status !== 'cancelled'
  )).length;

  const updateDepositStatus = async (
    rental: Rental,
    depositStatus: NonNullable<Rental['depositStatus']>,
  ) => {
    if (depositStatus === depositStatusOf(rental) || savingRentalId) return;
    setSavingRentalId(rental.id);
    try {
      await updateRental(rental.id, { depositStatus });
    } finally {
      setSavingRentalId(null);
    }
  };

  const statusSelect = (rental: Rental) => (
    <select
      aria-label={`Trạng thái tiền cọc đơn ${rental.id}`}
      value={depositStatusOf(rental)}
      onChange={event => void updateDepositStatus(
        rental,
        event.target.value as NonNullable<Rental['depositStatus']>,
      )}
      disabled={savingRentalId === rental.id || rental.status === 'cancelled'}
      style={{
        minWidth: '124px',
        padding: '7px 10px',
        borderRadius: '8px',
        border: `1px solid ${depositStatusOf(rental) === 'received' ? '#a7f3d0' : '#fde68a'}`,
        background: depositStatusOf(rental) === 'received' ? '#ecfdf5' : '#fffbeb',
        color: depositStatusOf(rental) === 'received' ? '#047857' : '#b45309',
        fontFamily: 'inherit',
        fontSize: '12px',
        fontWeight: 700,
        cursor: rental.status === 'cancelled' ? 'not-allowed' : 'pointer',
      }}
    >
      <option value="received">Đã cọc</option>
      <option value="pending">Chưa cọc</option>
    </select>
  );

  return (
    <div className="deposits-page" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0, fontSize: '24px', letterSpacing: '-0.02em' }}>Quản lý Tiền cọc</h1>
          <span style={{ padding: '3px 9px', borderRadius: '999px', background: '#ecfdf5', color: '#047857', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
            Tài chính
          </span>
        </div>
        <p style={{ margin: '5px 0 0' }}>
          Theo dõi cọc tiền mặt, xe máy thế chấp và tình trạng nhận cọc của tất cả đơn thuê.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '16px' }}>
        <Card style={{ borderLeft: '4px solid #059669', borderRadius: 8 }} styles={{ body: { padding: 16 } }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Đã nhận cọc</div>
              <Statistic value={receivedCount} valueStyle={{ fontSize: '25px', fontWeight: 700, color: '#047857' }} />
            </div>
            <CircleCheck size={22} color="#059669" />
          </div>
        </Card>
        <Card style={{ borderLeft: '4px solid #f59e0b', borderRadius: 8 }} styles={{ body: { padding: 16 } }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Chưa nhận cọc</div>
              <Statistic value={pendingCount} valueStyle={{ fontSize: '25px', fontWeight: 700, color: '#b45309' }} />
            </div>
            <Clock3 size={22} color="#f59e0b" />
          </div>
        </Card>
        <Card style={{ borderLeft: '4px solid #2563eb', borderRadius: 8 }} styles={{ body: { padding: 16 } }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Tiền mặt đang giữ</div>
              <Statistic value={heldCash} suffix="₫" valueStyle={{ fontSize: '22px', fontWeight: 700, color: '#1d4ed8' }} />
            </div>
            <CircleDollarSign size={22} color="#2563eb" />
          </div>
        </Card>
        <Card style={{ borderLeft: '4px solid #7c3aed', borderRadius: 8 }} styles={{ body: { padding: 16 } }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Xe cọc đang giữ</div>
              <Statistic value={heldVehicles} suffix="xe" valueStyle={{ fontSize: '25px', fontWeight: 700, color: '#6d28d9' }} />
            </div>
            <Bike size={22} color="#7c3aed" />
          </div>
        </Card>
      </div>

      <div className="card deposits-filter-bar" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '260px', flex: '1 1 320px', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-page)' }}>
          <Search size={17} color="var(--text-secondary)" />
          <input
            value={searchTerm}
            onChange={event => setSearchTerm(event.target.value)}
            placeholder="Tìm mã đơn, khách hàng, SĐT hoặc biển số..."
            aria-label="Tìm kiếm đơn tiền cọc"
            style={{ width: '100%', border: 0, outline: 0, background: 'transparent', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: '13px' }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={event => setStatusFilter(event.target.value as DepositStatusFilter)}
          aria-label="Lọc trạng thái tiền cọc"
          style={{ minWidth: '170px', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'white', fontFamily: 'inherit', fontWeight: 600 }}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="received">Đã cọc</option>
          <option value="pending">Chưa cọc</option>
        </select>
        <select
          value={methodFilter}
          onChange={event => setMethodFilter(event.target.value as DepositMethodFilter)}
          aria-label="Lọc phương thức đặt cọc"
          style={{ minWidth: '180px', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'white', fontFamily: 'inherit', fontWeight: 600 }}
        >
          <option value="all">Tất cả phương thức</option>
          <option value="cash">Cọc bằng tiền</option>
          <option value="motorbike">Cọc bằng xe</option>
        </select>
      </div>

      <div className="card card-no-pad">
        <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <WalletCards size={19} color="var(--primary)" />
            <strong>Danh sách tiền cọc</strong>
          </div>
          <span style={{ color: 'var(--text-secondary)', fontSize: '12.5px' }}>{filteredRentals.length} đơn phù hợp</span>
        </div>

        <div className="desktop-only-table table-wrap" style={{ border: 0, borderRadius: 0 }}>
          <table className="data-table" style={{ minWidth: '980px' }}>
            <thead>
              <tr>
                <th>Đơn thuê</th>
                <th>Khách hàng</th>
                <th>Xe thuê</th>
                <th>Phương thức cọc</th>
                <th>Giá trị / Tài sản cọc</th>
                <th>Trạng thái cọc</th>
                <th>Hoàn cọc</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paginatedRentals.map(rental => (
                <tr key={rental.id}>
                  <td>
                    <strong className="font-mono">#{rental.id}</strong>
                    <div style={{ marginTop: '3px', color: 'var(--text-muted)', fontSize: '11.5px' }}>
                      {formatDate(rental.createdAt || rental.startDate)} · {rentalStatusLabel[rental.status]}
                    </div>
                  </td>
                  <td>
                    <strong>{rental.customerName || 'Chưa cập nhật'}</strong>
                    <div style={{ marginTop: '3px', color: 'var(--text-muted)', fontSize: '11.5px' }}>{rental.customerPhone || '—'}</div>
                  </td>
                  <td><span className="license-plate">{rental.carId}</span></td>
                  <td>
                    <span className={`badge ${depositMethodOf(rental) === 'cash' ? 'badge-rented' : 'badge-maintenance'}`}>
                      {depositMethodOf(rental) === 'cash' ? 'Cọc bằng tiền' : 'Cọc bằng xe'}
                    </span>
                  </td>
                  <td style={{ maxWidth: '260px', whiteSpace: 'normal', fontWeight: 600 }}>{depositDescription(rental)}</td>
                  <td>{statusSelect(rental)}</td>
                  <td>
                    <span className={`badge ${rental.depositReturnedAt ? 'badge-available' : 'badge-inactive'}`}>
                      {rental.depositReturnedAt ? `Đã hoàn ${formatDate(rental.depositReturnedAt)}` : 'Chưa hoàn'}
                    </span>
                  </td>
                  <td>
                    <Link
                      to={`/contracts?id=${encodeURIComponent(rental.id)}`}
                      aria-label={`Xem chi tiết đơn ${rental.id}`}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}
                    >
                      <Eye size={15} /> Chi tiết
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {paginatedRentals.length === 0 && <Empty description="Không tìm thấy đơn cọc phù hợp" style={{ padding: '36px 16px' }} />}
        </div>

        <div className="mobile-only-cards entity-mobile-list-in-card">
          {paginatedRentals.map(rental => (
            <article className="entity-mobile-card" key={rental.id}>
              <div className="entity-mobile-head">
                <div>
                  <strong className="font-mono">#{rental.id}</strong>
                  <span>{rental.customerName} · {rental.customerPhone}</span>
                </div>
                <span className={`entity-mobile-status ${depositStatusOf(rental) === 'received' ? 'success' : 'warning'}`}>
                  {depositStatusOf(rental) === 'received' ? 'Đã cọc' : 'Chưa cọc'}
                </span>
              </div>
              <div className="entity-mobile-fields">
                <div><span>Xe thuê</span><strong>{rental.carId}</strong></div>
                <div><span>Phương thức</span><strong>{depositMethodOf(rental) === 'cash' ? 'Cọc bằng tiền' : 'Cọc bằng xe'}</strong></div>
                <div><span>Giá trị / tài sản</span><strong className="entity-mobile-amount">{depositDescription(rental)}</strong></div>
                <div><span>Hoàn cọc</span><strong>{rental.depositReturnedAt ? `Đã hoàn ${formatDate(rental.depositReturnedAt)}` : 'Chưa hoàn'}</strong></div>
              </div>
              <div className="entity-mobile-actions">
                {statusSelect(rental)}
                <Link to={`/contracts?id=${encodeURIComponent(rental.id)}`}><Eye size={14} /> Xem đơn</Link>
              </div>
            </article>
          ))}
          {paginatedRentals.length === 0 && <div className="entity-mobile-empty">Không tìm thấy đơn cọc phù hợp.</div>}
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredRentals.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          unitName="đơn cọc"
        />
      </div>
    </div>
  );
};

export default Deposits;
