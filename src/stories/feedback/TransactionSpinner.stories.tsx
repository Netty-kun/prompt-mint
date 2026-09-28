import type { Meta, StoryObj } from '@storybook/react';
import { TransactionSpinner } from '../../components/transaction-feedback/TransactionSpinner';
import React from 'react';

const meta: Meta<typeof TransactionSpinner> = {
  title: 'Feedback/TransactionSpinner',
  component: TransactionSpinner,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof TransactionSpinner>;

export const Default: Story = {
  args: {
    size: 'md',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
  },
};
