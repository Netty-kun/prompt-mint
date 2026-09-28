import type { Meta, StoryObj } from '@storybook/react';
import { MarkdownPreview } from '../../components/MarkdownPreview';
import React from 'react';

const meta: Meta<typeof MarkdownPreview> = {
  title: 'Marketplace/MarkdownPreview',
  component: MarkdownPreview,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof MarkdownPreview>;

export const RichContent: Story = {
  args: {
    content: "# System Prompt: Soroban Security Auditor\n\n### Instructions\n1. Inspect all storage key mutations.\n2. Verify `extend_key_ttl` on all reads.\n\n```rust\npub fn audit() {}\n```",
  },
};
