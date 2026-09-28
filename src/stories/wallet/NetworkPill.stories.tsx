import type { Meta, StoryObj } from '@storybook/react';
import NetworkPill from '../../components/NetworkPill';
import { WalletContext, type WalletContextType } from '../../providers/WalletProvider';
import React from 'react';

const mockWallet: WalletContextType = {
  address: 'GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37',
  network: 'TESTNET',
  networkPassphrase: 'Test SDF Network ; September 2015',
  status: 'connected',
  connect: async () => {},
  disconnect: async () => {},
  reconnect: async () => {},
  signTransaction: async () => ({} as any),
  signMessage: async () => ({} as any),
};

const meta: Meta<typeof NetworkPill> = {
  title: 'Wallet/NetworkPill',
  component: NetworkPill,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <WalletContext.Provider value={mockWallet}>
        <Story />
      </WalletContext.Provider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof NetworkPill>;

export const Default: Story = {};
