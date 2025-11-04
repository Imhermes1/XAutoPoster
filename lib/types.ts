// Type definitions for the X Autoposter application

export type BulkPostStatus = 'draft' | 'pending' | 'posted' | 'failed';

export interface BulkPost {
  id: string;
  batch_id: string;
  post_text: string;
  media_ids?: string[];
  link_url?: string;
  scheduled_for?: string;
  status: BulkPostStatus;
  created_at: string;
  posted_at?: string;
  x_post_id?: string;
  error_message?: string;
}

export interface PostSchedule {
  id: string;
  scheduled_for: string;
}

export interface ScheduleRequest {
  post_schedules: PostSchedule[];
}

export interface BatchGenerationRequest {
  topic: string;
  count: number;
  model?: string;
  scheduled_times?: string[];
  save_as_draft?: boolean;
}

export interface BatchGenerationResponse {
  success: boolean;
  batch_id: string;
  posts_generated: number;
  posts: BulkPost[];
}

export interface DraftBatch {
  batch_id: string;
  post_count: number;
  created_at: string;
  posts: BulkPost[];
}
