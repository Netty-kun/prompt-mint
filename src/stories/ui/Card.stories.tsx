import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import React from 'react';

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Prompt Listing</CardTitle>
        <CardDescription>Advanced GPT-4 Coding System Prompt</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Generates production-ready Rust and TypeScript code with comprehensive test coverage.
        </p>
      </CardContent>
      <CardFooter className="flex justify-between">
        <span className="font-bold text-lg">25 XLM</span>
        <Button size="sm">Purchase</Button>
      </CardFooter>
    </Card>
  ),
};
