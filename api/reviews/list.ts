import { getReviews } from "./data";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { promptId } = req.query;

  if (!promptId) {
    res.status(400).json({ error: "promptId query parameter is required" });
    return;
  }

  try {
    const reviews = getReviews(String(promptId));
    const visibleReviews = reviews.filter((review) => review.moderationDecision?.status !== "removed");

    const sortedReviews = [...reviews].sort((a, b) => b.createdAt - a.createdAt);

    const averageRating =
      visibleReviews.length > 0
        ? visibleReviews.reduce((sum, r) => sum + r.rating, 0) / visibleReviews.length
        : 0;

    res.status(200).json({
      reviews: sortedReviews.map((r) => {
        const wasRemoved = r.moderationDecision?.status === "removed";
        return {
          id: r.id,
          promptId: r.promptId,
          userAddress: wasRemoved ? "" : r.userAddress,
          rating: wasRemoved ? 0 : r.rating,
          text: wasRemoved ? "" : r.text,
          createdAt: r.createdAt,
          verified: wasRemoved ? false : r.verified,
          helpfulVotes: wasRemoved ? 0 : r.helpfulVotes,
          moderationDecision: r.moderationDecision || null,
          sellerResponse: wasRemoved ? null : r.sellerResponse || null,
        };
      }),
      stats: {
        total: visibleReviews.length,
        averageRating: Math.round(averageRating * 10) / 10,
        distribution: {
          5: visibleReviews.filter((r) => r.rating === 5).length,
          4: visibleReviews.filter((r) => r.rating === 4).length,
          3: visibleReviews.filter((r) => r.rating === 3).length,
          2: visibleReviews.filter((r) => r.rating === 2).length,
          1: visibleReviews.filter((r) => r.rating === 1).length,
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch reviews";
    console.error("Review fetch error:", message);
    res.status(500).json({ error: message });
  }
}
