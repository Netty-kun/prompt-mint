import type { Meta, StoryObj } from '@storybook/react';
import { AnimatedCheckmark } from '../../components/AnimatedCheckmark';
import React from 'react';

const meta: Meta<typeof AnimatedCheckmark> = {
  title: 'Feedback/AnimatedCheckmark',
  component: AnimatedCheckmark,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof AnimatedCheckmark>;

export const Default: Story = {
  args: {
    size: 48,
  },
};
