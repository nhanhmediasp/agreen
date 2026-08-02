import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  unitName?: string;
}

/**
 * Pagination — Component phân trang thông minh chuẩn SaaS:
 * - Tự động rút gọn trang bằng dấu 3 chấm (...) khi có nhiều trang (ví dụ 50 trang: 1 2 3 ... 50)
 * - Hiển thị gọn trên 1 dòng, không bị ép vỡ chữ
 * - Nút Trước / Sau tiện lợi
 */
export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  unitName = 'mục'
}) => {
  if (totalPages <= 1) return null;

  // Tính toán danh sách số trang thông minh
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }

      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="pagination" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid var(--border)', flexWrap: 'wrap', gap: '12px', background: 'white' }}>
      <div className="pagination-summary" style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
        Hiển thị <strong style={{ color: 'var(--text-primary)' }}>{startItem} - {endItem}</strong> trong tổng số <strong style={{ color: 'var(--primary)' }}>{totalItems}</strong> {unitName}
      </div>

      <div className="pagination-controls" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={{
            padding: '6px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            background: 'white',
            color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            opacity: currentPage === 1 ? 0.6 : 1
          }}
        >
          <ChevronLeft size={15} /> Trước
        </button>

        {getPageNumbers().map((p, idx) => (
          typeof p === 'number' ? (
            <button
              key={idx}
              type="button"
              onClick={() => onPageChange(p)}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: currentPage === p ? 'var(--primary)' : 'white',
                color: currentPage === p ? 'white' : 'var(--text-primary)',
                fontSize: '13px',
                fontWeight: currentPage === p ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {p}
            </button>
          ) : (
            <span key={idx} style={{ padding: '0 4px', color: 'var(--text-muted)', fontSize: '13px' }}>...</span>
          )
        ))}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={{
            padding: '6px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            background: 'white',
            color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            opacity: currentPage === totalPages ? 0.6 : 1
          }}
        >
          Sau <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
};
