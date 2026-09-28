import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../../components/ui/button';
import { Sparkles, Trash2, ArrowRight } from 'lucide-react';
import React from 'react';

/**
 * Primary interactive button component supporting multiple visual variants,
 * sizes, icons, loading, and disabled states.
 */
const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
      description: 'Visual stylistic variant',
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
      description: 'Size dimension preset',
    },
    disabled: {
      control: 'boolean',
      description: 'Disables user interaction',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: {
    children: 'Primary Action',
    variant: 'default',
    size: 'default',
  },
};

export const Secondary: Story = {
  args: {
    children: 'Secondary Action',
    variant: 'secondary',
  },
};

export const Destructive: Story = {
  args: {
    children: (
      <>
        <Trash2 className="w-4 h-4 mr-2" />
        Delete Listing
      </>
    ),
    variant: 'destructive',
  },
};

export const Outline: Story = {
  args: {
    children: 'Outline Button',
    variant: 'outline',
  },
};

export const Ghost: Story = {
  args: {
    children: 'Ghost Button',
    variant: 'ghost',
  },
};

export const Link: Story = {
  args: {
    children: 'Link Button',
    variant: 'link',
  },
};

export const WithIcon: Story = {
  args: {
    children: (
      <>
        <Sparkles className="w-4 h-4 mr-2" />
        Generate Prompt
      </>
    ),
    variant: 'default',
  },
};

export const Disabled: Story = {
  args: {
    children: 'Disabled State',
    disabled: true,
  },
};
