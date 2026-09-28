import type { Meta, StoryObj } from '@storybook/react';
import { WatermarkedPreview } from '../../components/WatermarkedPreview';
import React from 'react';

const meta: Meta<typeof WatermarkedPreview> = {
  title: 'Marketplace/WatermarkedPreview',
  component: WatermarkedPreview,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof WatermarkedPreview>;

export const Default: Story = {
  args: {
    content: 'Act as a Senior Principal Cloud Architect. When designing microservice architectures on AWS and Stellar, prioritize idempotency...',
    previewLength: 50,
    hasAccess: false,
  },
};

export const Unlocked: Story = {
  args: {
    content: 'Full unlocked system prompt content ready for use without obfuscation.',
    previewLength: 50,
    hasAccess: true,
  },
};
