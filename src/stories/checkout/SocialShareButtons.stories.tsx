import type { Meta, StoryObj } from '@storybook/react';
import { SocialShareButtons } from '../../components/SocialShareButtons';
import React from 'react';

const meta: Meta<typeof SocialShareButtons> = {
  title: 'Checkout/SocialShareButtons',
  component: SocialShareButtons,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SocialShareButtons>;

export const Default: Story = {
  args: {
    title: 'Check out this Soroban Auditor prompt on PromptMint!',
    url: 'https://promptmint.io/prompts/42',
  },
};
