import type { Meta, StoryObj } from '@storybook/react';
import { PromptTrustMetadata } from '../../components/PromptTrustMetadata';
import React from 'react';

const meta: Meta<typeof PromptTrustMetadata> = {
  title: 'Marketplace/PromptTrustMetadata',
  component: PromptTrustMetadata,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof PromptTrustMetadata>;

export const Default: Story = {
  args: {
    creatorAddress: 'GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37',
    rating: 4.9,
    salesCount: 142,
    verifiedCreator: true,
  },
};
