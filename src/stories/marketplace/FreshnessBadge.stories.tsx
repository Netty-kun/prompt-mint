import type { Meta, StoryObj } from '@storybook/react';
import { FreshnessBadge } from '../../components/FreshnessBadge';
import React from 'react';

const meta: Meta<typeof FreshnessBadge> = {
  title: 'Marketplace/FreshnessBadge',
  component: FreshnessBadge,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof FreshnessBadge>;

export const CachedData: Story = {
  args: {
    timestamp: Date.now() - 60000,
    isCached: true,
  },
};

export const OfflineData: Story = {
  args: {
    timestamp: Date.now() - 3600000,
    isOffline: true,
  },
};

export const DegradedData: Story = {
  args: {
    timestamp: Date.now() - 7200000,
    isDegraded: true,
  },
};
