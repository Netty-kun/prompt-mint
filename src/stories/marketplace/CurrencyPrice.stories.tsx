import type { Meta, StoryObj } from '@storybook/react';
import { CurrencyPrice } from '../../components/CurrencyPrice';
import React from 'react';

const meta: Meta<typeof CurrencyPrice> = {
  title: 'Marketplace/CurrencyPrice',
  component: CurrencyPrice,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof CurrencyPrice>;

export const XLMPrice: Story = {
  args: {
    stroops: 100000000n, // 10 XLM
  },
};

export const Free: Story = {
  args: {
    stroops: 0n,
  },
};
