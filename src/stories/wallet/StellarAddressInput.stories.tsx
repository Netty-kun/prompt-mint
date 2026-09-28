import type { Meta, StoryObj } from '@storybook/react';
import { StellarAddressInput } from '../../components/StellarAddressInput';
import React from 'react';

const meta: Meta<typeof StellarAddressInput> = {
  title: 'Wallet/StellarAddressInput',
  component: StellarAddressInput,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof StellarAddressInput>;

export const Default: Story = {
  args: {
    value: '',
    onChange: (addr: string) => console.log('Address:', addr),
  },
};

export const ValidAddress: Story = {
  args: {
    value: 'GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37',
    onChange: (addr: string) => console.log('Address:', addr),
  },
};
