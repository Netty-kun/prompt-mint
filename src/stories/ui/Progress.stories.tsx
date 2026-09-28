import type { Meta, StoryObj } from '@storybook/react';
import { Progress } from '../../components/ui/progress';
import React from 'react';

const meta: Meta<typeof Progress> = {
  title: 'UI/Progress',
  component: Progress,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Progress>;

export const TwentyFivePercent: Story = {
  args: {
    value: 25,
  },
};

export const SeventyFivePercent: Story = {
  args: {
    value: 75,
  },
};

export const Complete: Story = {
  args: {
    value: 100,
  },
};
