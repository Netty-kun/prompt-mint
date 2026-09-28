"use client";

import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Zap,
  Star,
  TrendingUp,
  Award,
  Heart,
  Code,
  ImageIcon,
  Type,
  BarChart,
} from "lucide-react";
import { useReducedMotion } from "@/components/ReducedMotionProvider";

export default function MarqueeSection() {
  const { prefersReducedMotion } = useReducedMotion();

  const items1 = [
    { icon: <Sparkles className="size-4" />, text: "10,000+ AI Prompts" },
    { icon: <Zap className="size-4" />, text: "Instant Delivery" },
    { icon: <Star className="size-4" />, text: "Top-Rated Creators" },
    { icon: <TrendingUp className="size-4" />, text: "Weekly Updates" },
    { icon: <Award className="size-4" />, text: "Hackathon Winner" },
    { icon: <Heart className="size-4" />, text: "Community Favorites" },
  ];

  const items2 = [
    { icon: <Code className="size-4" />, text: "Code Generation" },
    { icon: <ImageIcon className="size-4" />, text: "Image Prompts" },
    { icon: <Type className="size-4" />, text: "Text & Writing" },
    { icon: <BarChart className="size-4" />, text: "Marketing Copy" },
    { icon: <Sparkles className="size-4" />, text: "Creative Ideas" },
    { icon: <Zap className="size-4" />, text: "Productivity Boosters" },
  ];

  const marqueeClass = prefersReducedMotion
    ? "flex whitespace-nowrap overflow-hidden"
    : "flex whitespace-nowrap animate-marquee";

  const marqueeReverseClass = prefersReducedMotion
    ? "flex whitespace-nowrap overflow-hidden mt-3"
    : "flex whitespace-nowrap animate-marquee-reverse mt-3";

  return (
    <section className="py-6  border-gray-800 overflow-hidden">
      <div className="relative">
        {/* First marquee row */}
        <div className={marqueeClass}>
          {[...items1, ...items1].map((item, index) => (
            <Badge
              key={`row1-${index}`}
              variant="outline"
              className="border-purple-500/30 bg-black/50 backdrop-blur-sm text-white px-4 py-1.5 flex items-center gap-2 whitespace-nowrap mx-2"
            >
              {item.icon}
              {item.text}
            </Badge>
          ))}
        </div>

        {/* Second marquee row */}
        <div className={marqueeReverseClass}>
          {[...items2, ...items2].map((item, index) => (
            <Badge
              key={`row2-${index}`}
              variant="outline"
              className="border-purple-500/30 bg-black/50 backdrop-blur-sm text-white px-4 py-1.5 flex items-center gap-2 whitespace-nowrap mx-2"
            >
              {item.icon}
              {item.text}
            </Badge>
          ))}
        </div>
      </div>
    </section>
  );
}
