import type { Meta, StoryObj } from '@storybook/react';
import { CopyButton } from '../../components/CopyButton';
import React from 'react';

const meta: Meta<typeof CopyButton> = {
  title: 'Checkout/CopyButton',
  component: CopyButton,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof CopyButton>;

export const Default: Story = {
  args: {
    text: 'GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37',
  },
};
