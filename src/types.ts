export type StoryStatus = 'approved' | 'pending' | 'rejected';
export type MediaType = 'text' | 'video' | 'photo';

export interface AuthorInfo {
  isAnonymous: boolean;
  name?: string;
  linkedin?: string;
  instagram?: string;
  website?: string;
}

export interface Story {
  id: string;
  createdAt: number;
  title: string;
  category: string;
  author: AuthorInfo;
  mediaType: MediaType;
  content: string; // Detailed story text or description
  learnings?: string; // What was learned
  photoUrl?: string; // Data URL or object URL of photo
  videoUrl?: string; // Data URL or object URL of compressed video
  videoDuration?: number; // In seconds
  status: StoryStatus;
  likes?: number;
  featured?: boolean; // Pinned
}

export interface BoardConfig {
  minIntervalSeconds: number; // Min time between random spotlights
  maxIntervalSeconds: number; // Max time between random spotlights
  readingTimeSeconds: number; // Fullscreen time for text/photo cards
  videoAutoplay: boolean;
  videoMuted: boolean;
  swimSpeed: 'slow' | 'normal' | 'fast';
  autoApprove: boolean; // Stories appear immediately
  ambientParticles: boolean;
  spotlightEnabled: boolean; // Auto-cycle running
}
