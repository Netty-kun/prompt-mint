import type { Meta, StoryObj } from '@storybook/react';
import { PromotionalPriceDisplay } from '../../components/PromotionalPrice';
import React from 'react';

const meta: Meta<typeof PromotionalPriceDisplay> = {
  title: 'Marketplace/PromotionalPriceDisplay',
  component: PromotionalPriceDisplay,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof PromotionalPriceDisplay>;

export const Default: Story = {
  args: {
    promptId: '1',
    basePrice: 500000000n,
    showOriginal: true,
    showTimer: true,
  },
};
