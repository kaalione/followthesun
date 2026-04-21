import { z } from 'zod';

export const VenueTypeSchema = z.enum(['bar', 'restaurant', 'cafe', 'pub']);
export type VenueType = z.infer<typeof VenueTypeSchema>;

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

  // Google Places enrichment (optional — populated by enrichment script)
  googlePlaceId: z.string().optional(),
  googleRating: z.number().optional(),
  googleRatingCount: z.number().optional(),
  googlePriceLevel: z.number().optional(),
  googlePhotos: z.array(z.string()).optional(),
  googleMapsUrl: z.string().optional(),
});

export type Venue = z.infer<typeof VenueSchema>;

export interface VenueWithSunStatus extends Venue {
  inSun: boolean | null;
  lastChecked: Date;
}
