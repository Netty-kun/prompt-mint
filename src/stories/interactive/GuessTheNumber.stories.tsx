import type { Meta, StoryObj } from '@storybook/react';
import { GuessTheNumber } from '../../components/GuessTheNumber';
import React from 'react';

const meta: Meta<typeof GuessTheNumber> = {
  title: 'Interactive/GuessTheNumber',
  component: GuessTheNumber,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof GuessTheNumber>;

export const Default: Story = {};
