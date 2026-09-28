import type { Meta, StoryObj } from '@storybook/react';
import SafeImage from '../../components/ui/SafeImage';
import React from 'react';

const meta: Meta<typeof SafeImage> = {
  title: 'UI/SafeImage',
  component: SafeImage,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SafeImage>;

export const ValidImage: Story = {
  args: {
    src: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400',
    alt: 'Abstract AI Art',
    className: 'w-64 h-40 rounded-lg object-cover',
  },
};

export const FallbackPlaceholder: Story = {
  args: {
    src: 'https://invalid-url-that-fails-to-load.xyz/broken.jpg',
    alt: 'Broken Image',
    className: 'w-64 h-40 rounded-lg object-cover',
  },
};
