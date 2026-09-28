import type { Meta, StoryObj } from '@storybook/react';
import { FeeEstimateBanner } from '../../components/FeeEstimateBanner';
import React from 'react';

const meta: Meta<typeof FeeEstimateBanner> = {
  title: 'Wallet/FeeEstimateBanner',
  component: FeeEstimateBanner,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof FeeEstimateBanner>;

export const LowCongestion: Story = {
  args: {
    feeStroops: 100n,
    networkCongestion: 'low',
  },
};

export const HighCongestion: Story = {
  args: {
    feeStroops: 15000n,
    networkCongestion: 'high',
  },
};
