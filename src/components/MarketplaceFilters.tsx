
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* eslint-disable no-unused-vars */
export interface MarketplaceFiltersProps {
  categories: string[];
  tags: string[];
  selectedCategories: string[];
  toggleCategory: (_cat: string) => void;
  selectedTag: string;
  setSelectedTag: (tag: string) => void;
  searchQuery: string;
  setSearchQuery: (_q: string) => void;
  creatorQuery: string;
  setCreatorQuery: (_q: string) => void;
  priceRange: [number, number];
  setPriceRange: (_r: [number, number]) => void;
  sortBy: string;
  setSortBy: (_s: string) => void;
  showInactive: boolean;
  setShowInactive: (_on: boolean) => void;
  onClear: () => void;
}
/* eslint-enable no-unused-vars */

const PRICE_MAX = 25;

export function MarketplaceFilters({
  categories,
  tags,
  selectedCategories,
  toggleCategory,
  selectedTag,
  setSelectedTag,
  creatorQuery,
  setCreatorQuery,
  priceRange,
  setPriceRange,
  sortBy,
  setSortBy,
  showInactive,
  setShowInactive,
  onClear,
}: MarketplaceFiltersProps) {
  const hasActiveFilters =
    selectedCategories.length > 0 ||
    Boolean(selectedTag) ||
    Boolean(creatorQuery) ||
    sortBy !== "recent" ||
    priceRange[0] !== 0 ||
    priceRange[1] !== PRICE_MAX ||
    showInactive;

  return (
    <div className="space-y-8">
      {/* Category chips */}
      <div className="space-y-3">
        <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-slate-500">
          Category
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge
            role="button"
            tabIndex={0}
            onClick={() => onClear()}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClear(); } }}
            className="cursor-pointer select-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/10"
          >
            All
          </Badge>
          {categories.map((cat) => {
            const isActive = selectedCategories.includes(cat);
            return (
              <Badge
                key={cat}
                role="button"
                tabIndex={0}
                onClick={() => toggleCategory(cat)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleCategory(cat);
                  }
                }}
                className={`cursor-pointer select-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
                  isActive
                    ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400 border-transparent"
                    : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/10"
                }`}
              >
                {cat}
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Creator search */}
      <div className="space-y-3">
        <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-slate-500">
          Creator
        </p>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={creatorQuery}
            onChange={(e) => setCreatorQuery(e.target.value)}
            placeholder="Search by creator address..."
            className="w-full h-11 rounded-xl border border-white/10 bg-white/5 pl-10 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            aria-label="Search by creator address"
          />
        </div>
      </div>

      {tags.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-slate-500">
            Tags
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge
              role="button"
              tabIndex={0}
              onClick={() => setSelectedTag("")}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedTag(""); } }}
              className={`cursor-pointer select-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
                !selectedTag
                  ? "bg-slate-100 text-slate-950 hover:bg-slate-200 border-transparent"
                  : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/10"
              }`}
            >
              All
            </Badge>
            {tags.map((tag) => (
              <Badge
                key={tag}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedTag(selectedTag === tag ? "" : tag)}
                onKeyDown={(e) => { 
                  if (e.key === "Enter" || e.key === " ") { 
                    e.preventDefault(); 
                    setSelectedTag(selectedTag === tag ? "" : tag); 
                  } 
                }}
                className={`cursor-pointer select-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
                  selectedTag === tag
                    ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400 border-transparent"
                    : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/10"
                }`}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Price range — two independent range inputs */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-slate-500">
            Price Range
          </p>
          <span className="text-xs font-mono text-emerald-400">
            {priceRange[0]} – {priceRange[1]} XLM
          </span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-6">Min</span>
            <input
              type="range"
              min={0}
              max={PRICE_MAX}
              step={1}
              value={priceRange[0]}
              onChange={(e) => {
                const next = Math.min(Number(e.target.value), priceRange[1]);
                setPriceRange([next, priceRange[1]]);
              }}
              className="flex-1 accent-emerald-500"
              aria-label="Minimum price in XLM"
            />
            <span className="w-10 text-right font-mono text-slate-400">
              {priceRange[0]}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-6">Max</span>
            <input
              type="range"
              min={0}
              max={PRICE_MAX}
              step={1}
              value={priceRange[1]}
              onChange={(e) => {
                const next = Math.max(Number(e.target.value), priceRange[0]);
                setPriceRange([priceRange[0], next]);
              }}
              className="flex-1 accent-emerald-500"
              aria-label="Maximum price in XLM"
            />
            <span className="w-10 text-right font-mono text-slate-400">
              {priceRange[1]}
            </span>
          </div>
        </div>
      </div>

      {/* Sort */}
      <div className="space-y-3">
        <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-slate-500">
          Sort By
        </p>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="border-white/5 bg-white/5 h-11 text-slate-100 transition-all hover:bg-white/10 focus:ring-emerald-500/30">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-white/10 text-slate-100">
            <SelectItem value="recent">Newest Arrivals</SelectItem>
            <SelectItem value="sales">Best Sellers</SelectItem>
            <SelectItem value="price-low">Price: Low to High</SelectItem>
            <SelectItem value="price-high">Price: High to Low</SelectItem>
            <SelectItem value="ending-soon">Ending Soon</SelectItem>
            <SelectItem value="bookmarked">Bookmarked First</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Availability */}
      <div className="space-y-3">
        <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-slate-500">
          Availability
        </p>
        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <span className="text-sm text-slate-400">
            Include inactive listings
          </span>
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="h-4 w-4 accent-emerald-500"
            aria-label="Include inactive listings"
          />
        </label>
      </div>

      {/* Clear */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          className="w-full text-slate-400 hover:text-white hover:bg-white/5 text-xs border border-white/10 h-9"
          onClick={onClear}
          type="button"
        >
          Clear All Filters
        </Button>
      )}
    </div>
  );
}
