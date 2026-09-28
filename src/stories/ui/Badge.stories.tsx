import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from '../../components/ui/badge';
import React from 'react';

const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'outline'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
  args: {
    children: 'Verified',
    variant: 'default',
  },
};

export const Secondary: Story = {
  args: {
    children: 'GPT-4',
    variant: 'secondary',
  },
};

export const Destructive: Story = {
  args: {
    children: 'Expired',
    variant: 'destructive',
  },
};

export const Outline: Story = {
  args: {
    children: 'Prompt Token',
    variant: 'outline',
  },
};
