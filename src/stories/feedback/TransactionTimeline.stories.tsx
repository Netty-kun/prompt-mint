import type { Meta, StoryObj } from '@storybook/react';
import { TransactionTimeline } from '../../components/transaction-feedback/TransactionTimeline';
import React from 'react';

const meta: Meta<typeof TransactionTimeline> = {
  title: 'Feedback/TransactionTimeline',
  component: TransactionTimeline,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof TransactionTimeline>;

export const InProgress: Story = {
  args: {
    steps: [
      { id: '1', label: 'Simulate Transaction', status: 'completed' },
      { id: '2', label: 'Wallet Signature', status: 'completed' },
      { id: '3', label: 'Ledger Inclusion', status: 'active' },
      { id: '4', label: 'Access Verification', status: 'pending' },
    ],
  },
};
