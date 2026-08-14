import type { Rental, Violation } from './AppContext';

export function parseArrayField<T>(
  value: unknown,
  { allowSingletonObject = false }: { allowSingletonObject?: boolean } = {},
): T[] {
  if (Array.isArray(value)) return value as T[];
  if (allowSingletonObject && value !== null && typeof value === 'object') return [value as T];
  if (typeof value !== 'string' || !value.trim()) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed as T[];
    if (allowSingletonObject && parsed !== null && typeof parsed === 'object') return [parsed as T];
    return [];
  } catch (error) {
    console.error('Invalid JSON array received from API', error);
    return [];
  }
}

export function mapRentalFromDB(db: Record<string, unknown>): Rental {
  const conditionImages = parseArrayField<string>(db.condition_images);
  const violations = parseArrayField<Violation>(
    db.violations,
    { allowSingletonObject: true },
  );

  return {
    id: db.id as string,
    carId: db.car_id as string,
    customerName: db.customer_name as string || '',
    customerPhone: db.customer_phone as string || '',
    startDate: db.start_date as string,
    endDate: db.end_date as string,
    rentalFee: Number(db.rental_fee) || 0,
    deliveryFee: Number(db.delivery_fee) || 0,
    deposit: Number(db.deposit) || 0,
    depositType: db.deposit_type === 'motorbike' ? 'motorbike' : 'cash',
    depositStatus: db.deposit_status === 'pending' ? 'pending' : 'received',
    depositVehicle: {
      plate: db.deposit_vehicle_plate as string || '',
      brand: db.deposit_vehicle_brand as string || '',
      model: db.deposit_vehicle_model as string || '',
      color: db.deposit_vehicle_color as string || '',
      note: db.deposit_vehicle_note as string || '',
    },
    depositReturnedAt: db.deposit_returned_at as string || undefined,
    depositReturnNote: db.deposit_return_note as string || undefined,
    discountAmount: Number(db.discount_amount) || 0,
    extraFee: Number(db.extra_fee) || 0,
    totalAmount: Number(db.total_amount) || 0,
    paymentStatus: db.payment_status as Rental['paymentStatus'],
    status: db.status as Rental['status'],
    startKm: Number(db.start_km) || 0,
    endKm: (db.end_km !== null && db.end_km !== undefined && db.end_km !== '') ? Number(db.end_km) : undefined,
    startFuel: db.start_fuel as string || 'full',
    endFuel: db.end_fuel as string || undefined,
    source: db.source as Rental['source'] || 'system',
    fileUrl: db.file_url as string || undefined,
    fileName: db.file_name as string || undefined,
    ownerCommissionAmount: Number(db.owner_commission_amount) || 0,
    conditionImages,
    violations,
    deliveredAt: db.delivered_at as string || undefined,
    returnedAt: db.returned_at as string || undefined,
    createdAt: db.created_at as string || undefined,
  };
}
