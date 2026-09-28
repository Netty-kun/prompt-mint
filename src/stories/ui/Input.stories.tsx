import type { Meta, StoryObj } from '@storybook/react';
import { Input } from '../../components/ui/input';
import React from 'react';

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: {
    placeholder: 'Enter prompt title...',
    type: 'text',
  },
};

export const Disabled: Story = {
  args: {
    value: 'Read-only value',
    disabled: true,
  },
};

export const Password: Story = {
  args: {
    type: 'password',
    placeholder: 'Enter unlock secret...',
  },
};
