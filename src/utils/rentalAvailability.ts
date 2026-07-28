interface RentalWindow {
  carId: string;
  startDate: string;
  endDate: string;
  status: string;
}

type VehicleStatus = 'ready' | 'reserved' | 'rented' | 'maintenance' | 'suspended';

export function bookingWindowsOverlap(
  firstStart: string,
  firstEnd: string,
  secondStart: string,
  secondEnd: string,
): boolean {
  return Date.parse(firstStart) < Date.parse(secondEnd)
    && Date.parse(firstEnd) > Date.parse(secondStart);
}

export function hasBookingConflict(
  carId: string,
  requestedStart: string,
  requestedEnd: string,
  rentals: RentalWindow[],
): boolean {
  if (
    !Number.isFinite(Date.parse(requestedStart))
    || !Number.isFinite(Date.parse(requestedEnd))
    || Date.parse(requestedEnd) <= Date.parse(requestedStart)
  ) {
    return false;
  }

  return rentals.some((rental) => (
    rental.carId === carId
    && (rental.status === 'pending' || rental.status === 'active')
    && bookingWindowsOverlap(
      requestedStart,
      requestedEnd,
      rental.startDate,
      rental.endDate,
    )
  ));
}

export function isVehicleSelectableForPeriod(
  vehicleStatus: VehicleStatus,
  carId: string,
  requestedStart: string,
  requestedEnd: string,
  rentals: RentalWindow[],
): boolean {
  if (vehicleStatus === 'maintenance' || vehicleStatus === 'suspended') return false;

  const hasCompleteRequestedPeriod = Number.isFinite(Date.parse(requestedStart))
    && Number.isFinite(Date.parse(requestedEnd))
    && Date.parse(requestedEnd) > Date.parse(requestedStart);

  if (!hasCompleteRequestedPeriod) {
    return vehicleStatus === 'ready';
  }

  return !hasBookingConflict(carId, requestedStart, requestedEnd, rentals);
}
