import { z } from 'zod';

export const VenueTypeSchema = z.enum(['bar', 'restaurant', 'cafe', 'pub']);
export type VenueType = z.infer<typeof VenueTypeSchema>;

export const GoogleReviewSchema = z.object({
  authorName: z.string(),
  rating: z.number(),
  text: z.string().optional(),
  relativeTime: z.string().optional(),
  photoUrl: z.string().optional(),
  publishTime: z.string().optional(),
});
export type GoogleReview = z.infer<typeof GoogleReviewSchema>;

export const VenueSchema = z.object({
  id: z.string(),
  name: z.string(),
  lat: z.number(),
  lng: z.number(),
  type: VenueTypeSchema,
  neighborhood: z.string(),
  address: z.string().optional(),
  openingHours: z.string().optional(),
  website: z.string().optional(),
  cuisine: z.string().optional(),
  phone: z.string().optional(),
  sunHoursNote: z.string().optional(),

  // Google Places basic enrichment (pass 1)
  googlePlaceId: z.string().optional(),
  googleRating: z.number().optional(),
  googleRatingCount: z.number().optional(),
  googlePriceLevel: z.number().optional(),
  googlePhotos: z.array(z.string()).optional(),
  googleMapsUrl: z.string().optional(),

  // Google Places rich enrichment (pass 2)
  googleReviews: z.array(GoogleReviewSchema).optional(),
  googleEditorialSummary: z.string().optional(),
  googlePhone: z.string().optional(),
  googleWebsite: z.string().optional(),
  googleAllowsDogs: z.boolean().optional(),
  googleOutdoorSeating: z.boolean().optional(),
  googleAccessibilityWheelchair: z.boolean().optional(),
  googleServesBreakfast: z.boolean().optional(),
  googleServesLunch: z.boolean().optional(),
  googleServesDinner: z.boolean().optional(),
  googleServesBeer: z.boolean().optional(),
  googleServesWine: z.boolean().optional(),
  googleServesVegetarian: z.boolean().optional(),
  googleGoodForGroups: z.boolean().optional(),
  googleLiveMusic: z.boolean().optional(),
});

export type Venue = z.infer<typeof VenueSchema>;

export interface VenueWithSunStatus extends Venue {
  inSun: boolean | null;
  lastChecked: Date;
}
