import type { Meta, StoryObj } from '@storybook/react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Search } from 'lucide-react';
import React from 'react';

const meta: Meta<typeof EmptyState> = {
  title: 'UI/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

export const NoResults: Story = {
  args: {
    variant: 'no-results',
    title: 'No prompts found',
    description: 'Try adjusting your search criteria or filters to find what you are looking for.',
  },
};

export const SearchEmpty: Story = {
  args: {
    variant: 'search-empty',
  },
};

export const NoPurchases: Story = {
  args: {
    variant: 'no-purchases',
  },
};
