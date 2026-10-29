export type MediaType = "image" | "gif" | "video";

export type Media = {
  type: MediaType;
  src: string;
  alt?: string;
  caption?: string;
};
