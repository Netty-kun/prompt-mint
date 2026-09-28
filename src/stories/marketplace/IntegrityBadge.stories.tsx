import type { Meta, StoryObj } from '@storybook/react';
import { IntegrityBadge } from '../../components/IntegrityBadge';
import React from 'react';

const meta: Meta<typeof IntegrityBadge> = {
  title: 'Marketplace/IntegrityBadge',
  component: IntegrityBadge,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof IntegrityBadge>;

export const Verified: Story = {
  args: {
    integrity: {
      status: 'verified',
      computedHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      storedHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    },
  },
};

export const Failed: Story = {
  args: {
    integrity: {
      status: 'failed',
      computedHash: '0000000000000000000000000000000000000000000000000000000000000000',
      storedHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    },
  },
};

export const Unavailable: Story = {
  args: {
    integrity: {
      status: 'unavailable',
    },
  },
};
