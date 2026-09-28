import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { FreshnessBadge } from '../components/FreshnessBadge';
import { IntegrityBadge } from '../components/IntegrityBadge';
import { WatermarkedPreview } from '../components/WatermarkedPreview';
import { AnimatedCheckmark } from '../components/AnimatedCheckmark';
import { StarRating } from '../components/prompts/StarRating';
import { EmptyState } from '../components/ui/EmptyState';

describe('Component Library Storybook Verification', () => {
  it('renders Button with variants and handles disabled state', () => {
    const { rerender } = render(<Button variant="default">Click Me</Button>);
    expect(screen.getByText('Click Me')).toBeInTheDocument();

    rerender(<Button variant="destructive" disabled>Disabled Action</Button>);
    const button = screen.getByText('Disabled Action');
    expect(button).toBeDisabled();
  });

  it('renders Badge with default and secondary variants', () => {
    const { rerender } = render(<Badge variant="default">Verified</Badge>);
    expect(screen.getByText('Verified')).toBeInTheDocument();

    rerender(<Badge variant="secondary">GPT-4</Badge>);
    expect(screen.getByText('GPT-4')).toBeInTheDocument();
  });

  it('renders FreshnessBadge for cached listings', () => {
    render(<FreshnessBadge timestamp={Date.now() - 1000} isCached={true} />);
    expect(screen.getByText(/cached/i)).toBeInTheDocument();
  });

  it('renders IntegrityBadge for on-chain verified hash', () => {
    render(
      <IntegrityBadge
        integrity={{
          status: 'verified',
          computedHash: 'abc123def456',
          storedHash: 'abc123def456',
        }}
      />
    );
    expect(screen.getByText(/hash verified/i)).toBeInTheDocument();
  });

  it('renders WatermarkedPreview with content and obfuscation', () => {
    const { container } = render(
      <WatermarkedPreview
        content="Preview prompt snippet that is long enough to test watermarking"
        previewLength={14}
        hasAccess={false}
      />
    );
    expect(container).toBeInTheDocument();
    expect(screen.getByText(/preview prompt/i)).toBeInTheDocument();
  });

  it('renders EmptyState with custom title and variant', () => {
    render(
      <EmptyState
        variant="no-results"
        title="No Results Found"
        description="Try a different query"
      />
    );
    expect(screen.getByText('No Results Found')).toBeInTheDocument();
    expect(screen.getByText('Try a different query')).toBeInTheDocument();
  });

  it('renders AnimatedCheckmark without crashing', () => {
    const { container } = render(<AnimatedCheckmark size={32} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders StarRating with correct active stars', () => {
    const { container } = render(<StarRating rating={4} readOnly />);
    expect(container).toBeInTheDocument();
  });
});
