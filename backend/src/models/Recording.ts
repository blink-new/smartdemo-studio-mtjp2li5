import mongoose, { Document, Schema } from 'mongoose';

export interface IUIEvent {
  type: 'click' | 'keypress' | 'hover' | 'scroll' | 'navigation';
  timestamp: number;
  coordinates?: { x: number; y: number };
  element?: string;
  value?: string;
  metadata?: Record<string, any>;
}

export interface IRecording extends Document {
  project: mongoose.Types.ObjectId;
  title: string;
  originalVideoUrl: string;
  processedVideoUrl?: string;
  audioUrl?: string;
  thumbnailUrl?: string;
  duration: number;
  fileSize: number;
  resolution: {
    width: number;
    height: number;
  };
  uiEvents: IUIEvent[];
  script: {
    segments: Array<{
      id: string;
      text: string;
      startTime: number;
      endTime: number;
      audioUrl?: string;
      voiceSettings?: {
        voice: string;
        speed: number;
        emotion: string;
      };
    }>;
    originalTranscript?: string;
  };
  visualEffects: Array<{
    type: 'blur' | 'zoom' | 'highlight' | 'annotation';
    startTime: number;
    endTime: number;
    coordinates?: { x: number; y: number; width: number; height: number };
    properties?: Record<string, any>;
  }>;
  subtitles: Array<{
    text: string;
    startTime: number;
    endTime: number;
    style?: Record<string, any>;
  }>;
  backgroundAudio?: {
    url: string;
    volume: number;
    fadeIn: number;
    fadeOut: number;
  };
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  processingProgress: number;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const uiEventSchema = new Schema<IUIEvent>({
  type: {
    type: String,
    enum: ['click', 'keypress', 'hover', 'scroll', 'navigation'],
    required: true
  },
  timestamp: {
    type: Number,
    required: true
  },
  coordinates: {
    x: Number,
    y: Number
  },
  element: String,
  value: String,
  metadata: Schema.Types.Mixed
}, { _id: false });

const recordingSchema = new Schema<IRecording>({
  project: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  originalVideoUrl: {
    type: String,
    required: true
  },
  processedVideoUrl: String,
  audioUrl: String,
  thumbnailUrl: String,
  duration: {
    type: Number,
    required: true,
    min: 0
  },
  fileSize: {
    type: Number,
    required: true,
    min: 0
  },
  resolution: {
    width: {
      type: Number,
      required: true
    },
    height: {
      type: Number,
      required: true
    }
  },
  uiEvents: [uiEventSchema],
  script: {
    segments: [{
      id: {
        type: String,
        required: true
      },
      text: {
        type: String,
        required: true
      },
      startTime: {
        type: Number,
        required: true
      },
      endTime: {
        type: Number,
        required: true
      },
      audioUrl: String,
      voiceSettings: {
        voice: String,
        speed: Number,
        emotion: String
      }
    }],
    originalTranscript: String
  },
  visualEffects: [{
    type: {
      type: String,
      enum: ['blur', 'zoom', 'highlight', 'annotation'],
      required: true
    },
    startTime: {
      type: Number,
      required: true
    },
    endTime: {
      type: Number,
      required: true
    },
    coordinates: {
      x: Number,
      y: Number,
      width: Number,
      height: Number
    },
    properties: Schema.Types.Mixed
  }],
  subtitles: [{
    text: {
      type: String,
      required: true
    },
    startTime: {
      type: Number,
      required: true
    },
    endTime: {
      type: Number,
      required: true
    },
    style: Schema.Types.Mixed
  }],
  backgroundAudio: {
    url: String,
    volume: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.3
    },
    fadeIn: {
      type: Number,
      default: 2
    },
    fadeOut: {
      type: Number,
      default: 2
    }
  },
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  processingProgress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  errorMessage: String
}, {
  timestamps: true
});

// Indexes for better query performance
recordingSchema.index({ project: 1, createdAt: -1 });
recordingSchema.index({ processingStatus: 1 });

export const Recording = mongoose.model<IRecording>('Recording', recordingSchema);