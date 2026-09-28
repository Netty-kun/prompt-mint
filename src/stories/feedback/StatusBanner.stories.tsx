import type { Meta, StoryObj } from '@storybook/react';
import { StatusBanner } from '../../components/StatusBanner';
import React from 'react';

const meta: Meta<typeof StatusBanner> = {
  title: 'Feedback/StatusBanner',
  component: StatusBanner,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof StatusBanner>;

export const Info: Story = {
  args: {
    type: 'info',
    message: 'New Soroban Protocol v23 upgrade scheduled for next epoch.',
  },
};

export const Warning: Story = {
  args: {
    type: 'warning',
    message: 'Testnet reset scheduled in 48 hours.',
  },
};
