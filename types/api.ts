export type PostVideoSource = "YOUTUBE" | "FACEBOOK";

export type PostLiveStatus =
  | "UNKNOWN"
  | "UPCOMING"
  | "LIVE"
  | "WAS_LIVE"
  | "NOT_LIVE";

export type PostStatus = "draft" | "published" | "expired";

export type CarouselStatus = "pending" | "active" | "inactive" | "expired";

export interface ApiAuthor {
  id: string;
  _id: string;
  username: string;
  displayName: string;
  role: string;
}

export interface ApiPaginatedResponse<T> {
  success?: boolean;
  data?: T[];
  posts?: T[];
  items?: T[];
  total?: number;
  page?: number;
  pages?: number;
}

export interface ApiItemResponse<T> {
  success?: boolean;
  data?: T;
  message?: string;
}

export interface Post {
  id: string;
  _id: string;
  title: string;
  description: string;
  mainImage: string | null;
  videoSource: PostVideoSource | null;
  youtubeUrl: string | null;
  youtubeVideoId: string | null;
  facebookUrl: string | null;
  profileName: string | null;
  eventDate: string | null;
  eventTime: string | null;
  location: string | null;
  isLive: boolean;
  liveStatus: PostLiveStatus;
  liveStatusCheckedAt: string | null;
  isPublished: boolean;
  status: PostStatus;
  postedDate: string;
  link: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  reminderEnabled: boolean;
  reminderSentAt: string | null;
  author: ApiAuthor | null;
  __v?: number;
}

export type MobilePublicPost = Pick<Post, "id" | "_id"> &
  Partial<
    Pick<
      Post,
      | "title"
      | "description"
      | "mainImage"
      | "videoSource"
      | "youtubeUrl"
      | "youtubeVideoId"
      | "facebookUrl"
      | "profileName"
      | "eventDate"
      | "eventTime"
      | "location"
      | "isLive"
      | "liveStatus"
      | "liveStatusCheckedAt"
      | "isPublished"
      | "status"
      | "postedDate"
      | "link"
      | "createdAt"
      | "updatedAt"
      | "expiresAt"
      | "reminderEnabled"
    >
  >;

export interface Carousel {
  id: string;
  _id: string;
  image: string | null;
  isActive: boolean;
  status: CarouselStatus;
  clicks: number;
  startDate: string;
  endDate: string | null;
  targetUrl: string | null;
  name: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  author: ApiAuthor | null;
  __v?: number;
  youtubeUrl?: string | null;
  youtubeVideoId?: string | null;
}

export interface StreamLink {
  id: string;
  _id: string;
  title: string;
  url: string;
  description: string | null;
  isActive: boolean;
  bitrate?: number | string | null;
  displayOrder?: number | null;
  metadataUrl?: string | null;
  metaUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  __v?: number;
}
