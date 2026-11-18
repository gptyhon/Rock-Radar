export const videoPresets = {
  "1080p30": { width: 1920, height: 1080, fps: 30 },
  "1080p60": { width: 1920, height: 1080, fps: 60 },
  "720p30": { width: 1280, height: 720, fps: 30 },
} as const;

export type VideoPreset = keyof typeof videoPresets;
export type VideoExportJob = {
  id: string;
  preset: VideoPreset;
  phase: "preparing" | "rendering" | "encoding" | "cancelling" | "cancelled" | "done" | "failed";
  frames: number;
  totalFrames: number;
  warnings: string[];
  error?: string;
};
