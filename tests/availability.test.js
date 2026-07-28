import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  hasBookingConflict,
  isVehicleSelectableForPeriod,
} from '../src/utils/rentalAvailability.ts';

const futureReservation = [{
  carId: '51A-123.45',
  status: 'pending',
  startDate: '2026-09-10T08:00:00.000Z',
  endDate: '2026-09-12T08:00:00.000Z',
}];

test('a Reserved vehicle remains selectable for non-overlapping earlier and later periods', () => {
  assert.equal(
    isVehicleSelectableForPeriod(
      'reserved',
      '51A-123.45',
      '2026-09-01T08:00:00.000Z',
      '2026-09-03T08:00:00.000Z',
      futureReservation,
    ),
    true,
  );
  assert.equal(
    isVehicleSelectableForPeriod(
      'reserved',
      '51A-123.45',
      '2026-09-13T08:00:00.000Z',
      '2026-09-15T08:00:00.000Z',
      futureReservation,
    ),
    true,
  );
  assert.equal(
    hasBookingConflict(
      '51A-123.45',
      '2026-09-11T08:00:00.000Z',
      '2026-09-13T08:00:00.000Z',
      futureReservation,
    ),
    true,
  );
});
