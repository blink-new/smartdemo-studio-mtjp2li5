import mongoose, { Document, Schema } from 'mongoose';

export interface IProject extends Document {
  title: string;
  description?: string;
  owner: mongoose.Types.ObjectId;
  collaborators: Array<{
    user: mongoose.Types.ObjectId;
    role: 'editor' | 'reviewer' | 'viewer';
    addedAt: Date;
  }>;
  recordings: mongoose.Types.ObjectId[];
  status: 'draft' | 'in_progress' | 'review' | 'completed' | 'archived';
  settings: {
    resolution: '720p' | '1080p' | '4k';
    frameRate: 30 | 60;
    audioQuality: 'standard' | 'high';
    autoSave: boolean;
    backgroundMusic: boolean;
  };
  metadata: {
    duration?: number;
    fileSize?: number;
    lastExported?: Date;
    exportFormats: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  collaborators: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['editor', 'reviewer', 'viewer'],
      default: 'viewer'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  recordings: [{
    type: Schema.Types.ObjectId,
    ref: 'Recording'
  }],
  status: {
    type: String,
    enum: ['draft', 'in_progress', 'review', 'completed', 'archived'],
    default: 'draft'
  },
  settings: {
    resolution: {
      type: String,
      enum: ['720p', '1080p', '4k'],
      default: '1080p'
    },
    frameRate: {
      type: Number,
      enum: [30, 60],
      default: 30
    },
    audioQuality: {
      type: String,
      enum: ['standard', 'high'],
      default: 'high'
    },
    autoSave: {
      type: Boolean,
      default: true
    },
    backgroundMusic: {
      type: Boolean,
      default: false
    }
  },
  metadata: {
    duration: Number,
    fileSize: Number,
    lastExported: Date,
    exportFormats: [String]
  }
}, {
  timestamps: true
});

// Indexes for better query performance
projectSchema.index({ owner: 1, createdAt: -1 });
projectSchema.index({ 'collaborators.user': 1 });
projectSchema.index({ status: 1 });

export const Project = mongoose.model<IProject>('Project', projectSchema);