/**
 * Status Badge Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../status-badge';
import type { ReservationStatus } from '@/lib/api';

describe('StatusBadge', () => {
  const statuses: ReservationStatus[] = ['reserved', 'confirmed', 'cancelled', 'expired'];

  it.each(statuses)('should render %s status correctly', (status) => {
    render(<StatusBadge status={status} />);
    
    const expectedLabels: Record<ReservationStatus, string> = {
      reserved: 'Reserved',
      confirmed: 'Confirmed',
      cancelled: 'Cancelled',
      expired: 'Expired',
    };
    
    expect(screen.getByText(expectedLabels[status])).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<StatusBadge status="reserved" className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
