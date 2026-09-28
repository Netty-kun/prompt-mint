import { describe, it, expect } from "vitest";
import {
  generateProductLD,
  generateItemListLD,
  injectStructuredData,
  clearStructuredData,
  type ListingMetadata,
} from "@/lib/seo/structuredData";

const sampleListing: ListingMetadata = {
  title: "AI Prompt Generator",
  description: "Generate high-quality AI prompts",
  imageUrl: "https://example.com/image.png",
  creator: "GDEXAMPLE123",
  category: "AI",
  priceStroops: "50000000",
  active: true,
  salesCount: 42,
};

describe("generateProductLD", () => {
  it("returns valid JSON-LD with @context and @type", () => {
    const ld = generateProductLD(sampleListing);
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("Product");
  });

  it("includes offer with price converted from stroops to XLM", () => {
    const ld = generateProductLD(sampleListing) as Record<string, any>;
    expect(ld.offers["@type"]).toBe("Offer");
    expect(ld.offers.price).toBe(5); // 50000000 stroops / 10_000_000
    expect(ld.offers.priceCurrency).toBe("XLM");
  });

  it("sets availability to InStock when active is true", () => {
    const ld = generateProductLD(sampleListing) as Record<string, any>;
    expect(ld.offers.availability).toBe("https://schema.org/InStock");
  });

  it("sets availability to OutOfStock when active is false", () => {
    const ld = generateProductLD({ ...sampleListing, active: false }) as Record<string, any>;
    expect(ld.offers.availability).toBe("https://schema.org/OutOfStock");
  });

  it("includes creator with @type Person", () => {
    const ld = generateProductLD(sampleListing) as Record<string, any>;
    expect(ld.creator["@type"]).toBe("Person");
    expect(ld.creator.identifier).toBe(sampleListing.creator);
  });

  it("omits optional fields when not provided", () => {
    const ld = generateProductLD({ title: "Minimal" });
    expect(ld.description).toBeUndefined();
    expect(ld.image).toBeUndefined();
    expect(ld.category).toBeUndefined();
  });
});

describe("generateItemListLD", () => {
  const items: ListingMetadata[] = [
    { title: "Item 1" },
    { title: "Item 2" },
    { title: "Item 3" },
  ];

  it("returns valid ItemList with itemListElement", () => {
    const ld = generateItemListLD(items);
    expect(ld["@type"]).toBe("ItemList");
    expect(Array.isArray(ld.itemListElement)).toBe(true);
    expect(ld.itemListElement).toHaveLength(3);
  });

  it("assigns correct positions", () => {
    const ld = generateItemListLD(items) as Record<string, any>;
    expect(ld.itemListElement[0].position).toBe(1);
    expect(ld.itemListElement[1].position).toBe(2);
    expect(ld.itemListElement[2].position).toBe(3);
  });

  it("limits to maxItems", () => {
    const ld = generateItemListLD(items, "https://example.com", 2);
    expect(ld.itemListElement).toHaveLength(2);
  });
});

describe("injectStructuredData / clearStructuredData", () => {
  it("injects a script tag into the document head", () => {
    injectStructuredData({ "@context": "https://schema.org", "@type": "WebSite" });
    const script = document.getElementById("prompt-mint-structured-data");
    expect(script).not.toBeNull();
    expect(script?.getAttribute("type")).toBe("application/ld+json");
  });

  it("removes the script tag on clear", () => {
    injectStructuredData({ "@context": "https://schema.org", "@type": "WebSite" });
    clearStructuredData();
    const script = document.getElementById("prompt-mint-structured-data");
    expect(script).toBeNull();
  });

  it("replaces existing script when called twice", () => {
    injectStructuredData({ name: "First" });
    injectStructuredData({ name: "Second" });
    const scripts = document.querySelectorAll("#prompt-mint-structured-data");
    expect(scripts).toHaveLength(1);
    const parsed = JSON.parse(scripts[0]?.textContent ?? "{}");
    expect(parsed.name).toBe("Second");
  });
});
