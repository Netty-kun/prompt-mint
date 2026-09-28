import type { Meta, StoryObj } from '@storybook/react';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import React from 'react';

const meta: Meta<typeof LanguageSwitcher> = {
  title: 'Interactive/LanguageSwitcher',
  component: LanguageSwitcher,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof LanguageSwitcher>;

export const Default: Story = {};
