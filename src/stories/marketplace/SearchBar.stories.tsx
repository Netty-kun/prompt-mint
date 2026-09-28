import type { Meta, StoryObj } from '@storybook/react';
import { SearchBar } from '../../components/SearchBar';
import React from 'react';

const meta: Meta<typeof SearchBar> = {
  title: 'Marketplace/SearchBar',
  component: SearchBar,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SearchBar>;

export const Empty: Story = {
  args: {
    searchQuery: '',
    onSearchChange: (q: string) => console.log('Search:', q),
  },
};

export const WithQuery: Story = {
  args: {
    searchQuery: 'Smart Contract Auditor',
    onSearchChange: (q: string) => console.log('Search:', q),
  },
};
