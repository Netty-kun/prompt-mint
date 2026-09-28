import type { Meta, StoryObj } from '@storybook/react';
import { NetworkMismatchBanner } from '../../components/NetworkMismatchBanner';
import React from 'react';

const meta: Meta<typeof NetworkMismatchBanner> = {
  title: 'Wallet/NetworkMismatchBanner',
  component: NetworkMismatchBanner,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof NetworkMismatchBanner>;

export const MismatchAlert: Story = {
  args: {
    expectedNetwork: 'testnet',
    currentNetwork: 'public',
  },
};
