import type { Meta, StoryObj } from '@storybook/react';
import { TransactionErrorBanner } from '../../components/transaction-feedback/TransactionErrorBanner';
import React from 'react';

const meta: Meta<typeof TransactionErrorBanner> = {
  title: 'Feedback/TransactionErrorBanner',
  component: TransactionErrorBanner,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof TransactionErrorBanner>;

export const Default: Story = {
  args: {
    title: 'Transaction Rejected',
    message: 'The transaction was cancelled by the user in Freighter.',
    errorCode: 'ERR_WALLET_REJECTED',
    onRetry: () => console.log('Retrying transaction...'),
  },
};
