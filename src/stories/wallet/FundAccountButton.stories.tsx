import type { Meta, StoryObj } from '@storybook/react';
import { FundAccountButton } from '../../components/FundAccountButton';
import React from 'react';

const meta: Meta<typeof FundAccountButton> = {
  title: 'Wallet/FundAccountButton',
  component: FundAccountButton,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof FundAccountButton>;

export const Default: Story = {
  args: {
    accountAddress: 'GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37',
  },
};
