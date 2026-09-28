import type { Meta, StoryObj } from '@storybook/react';
import { Textarea } from '../../components/ui/textarea';
import React from 'react';

const meta: Meta<typeof Textarea> = {
  title: 'UI/Textarea',
  component: Textarea,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Textarea>;

export const Default: Story = {
  args: {
    placeholder: 'Enter full secret prompt instructions here...',
    rows: 5,
  },
};

export const Disabled: Story = {
  args: {
    value: 'Disabled textarea content',
    disabled: true,
    rows: 4,
  },
};
