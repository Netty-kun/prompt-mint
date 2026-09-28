import type { Meta, StoryObj } from '@storybook/react';
import { TransactionStatusBanner } from '../../components/transaction-feedback/TransactionStatusBanner';
import React from 'react';

const meta: Meta<typeof TransactionStatusBanner> = {
  title: 'Feedback/TransactionStatusBanner',
  component: TransactionStatusBanner,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof TransactionStatusBanner>;

export const Pending: Story = {
  args: {
    status: 'pending',
    message: 'Submitting purchase transaction to Stellar ledger...',
  },
};

export const Success: Story = {
  args: {
    status: 'success',
    message: 'Transaction confirmed! Your prompt license is active.',
    txHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  },
};

export const ErrorState: Story = {
  args: {
    status: 'error',
    message: 'Transaction failed: Insufficient XLM balance.',
  },
};
