import type { Meta, StoryObj } from '@storybook/react';
import { TipButton } from '../../components/TipButton';
import React from 'react';

const meta: Meta<typeof TipButton> = {
  title: 'Checkout/TipButton',
  component: TipButton,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof TipButton>;

export const Default: Story = {
  args: {
    promptId: 1,
    creatorAddress: 'GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37',
  },
};
