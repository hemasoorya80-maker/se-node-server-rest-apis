/**
 * Empty State Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '../empty-state';

describe('EmptyState', () => {
  it('should render items empty state', () => {
    render(<EmptyState type="items" />);
    
    expect(screen.getByText('No items available')).toBeInTheDocument();
    expect(screen.getByText(/inventory is currently empty/i)).toBeInTheDocument();
  });

  it('should render reservations empty state', () => {
    render(<EmptyState type="reservations" />);
    
    expect(screen.getByText('No reservations yet')).toBeInTheDocument();
    expect(screen.getByText(/haven't made any reservations/i)).toBeInTheDocument();
  });

  it('should render search empty state', () => {
    render(<EmptyState type="search" />);
    
    expect(screen.getByText('No results found')).toBeInTheDocument();
  });

  it('should render action button when provided', () => {
    render(
      <EmptyState 
        type="reservations" 
        action={{ label: 'Browse Items', href: '/items' }}
      />
    );
    
    const link = screen.getByRole('link', { name: /browse items/i });
    expect(link).toHaveAttribute('href', '/items');
  });

  it('should not render button when action is not provided', () => {
    render(<EmptyState type="items" />);
    
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
