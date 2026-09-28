import type { Meta, StoryObj } from '@storybook/react';
import { StarRating } from '../../components/prompts/StarRating';
import React from 'react';

const meta: Meta<typeof StarRating> = {
  title: 'Reviews/StarRating',
  component: StarRating,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof StarRating>;

export const FiveStars: Story = {
  args: {
    rating: 5,
    readOnly: true,
  },
};

export const Interactive: Story = {
  args: {
    rating: 4,
    readOnly: false,
    onChange: (r: number) => console.log('Selected rating:', r),
  },
};
