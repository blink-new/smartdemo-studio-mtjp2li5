# SmartDemo Studio Backend

Enterprise-grade Node.js backend for SmartDemo Studio - AI-powered demo recording platform.

## Features

- **Authentication & Authorization**: JWT-based auth with role-based access control
- **Video Processing**: FFmpeg-based video processing with AI event detection
- **AI Integration**: OpenAI Whisper for transcription, ElevenLabs for voiceover
- **Real-time Collaboration**: Socket.IO for live editing and collaboration
- **Queue System**: Bull queues with Redis for background processing
- **File Storage**: AWS S3 integration for video and audio storage
- **Export System**: Multi-format export (MP4, GIF, WebM, Article)
- **Team Management**: Organization-based team collaboration

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Queue**: Bull with Redis
- **Real-time**: Socket.IO
- **Video Processing**: FFmpeg
- **AI Services**: OpenAI, ElevenLabs
- **Storage**: AWS S3
- **Authentication**: JWT

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB
- Redis
- FFmpeg
- AWS S3 account
- OpenAI API key
- ElevenLabs API key

### Installation

1. **Clone and install dependencies**:
```bash
cd backend
npm install
```

2. **Environment setup**:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start services**:
```bash
# Start MongoDB (if local)
mongod

# Start Redis (if local)
redis-server

# Start development server
npm run dev
```

### Environment Variables

```env
# Server
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5173

# Database
MONGODB_URI=mongodb://localhost:27017/smartdemo

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key

# AWS S3
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
S3_BUCKET_NAME=your-bucket

# AI Services
OPENAI_API_KEY=your-openai-key
ELEVENLABS_API_KEY=your-elevenlabs-key
```

## API Documentation

### Authentication

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "organization": "Acme Corp"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

### Projects

#### Create Project
```http
POST /api/projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Product Demo",
  "description": "Demo of our new feature",
  "settings": {
    "resolution": "1080p",
    "frameRate": 30
  }
}
```

#### Get Projects
```http
GET /api/projects?page=1&limit=10&status=draft
Authorization: Bearer <token>
```

#### Update Project
```http
PUT /api/projects/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Demo",
  "status": "in_progress"
}
```

### Recordings

#### Upload Recording
```http
POST /api/recordings
Authorization: Bearer <token>
Content-Type: multipart/form-data

video: <video-file>
projectId: <project-id>
title: "Screen Recording"
duration: 120
resolution: {"width": 1920, "height": 1080}
uiEvents: [...]
```

#### Update Script
```http
PUT /api/recordings/:id/script
Authorization: Bearer <token>
Content-Type: application/json

{
  "segments": [
    {
      "id": "seg1",
      "text": "Welcome to our demo",
      "startTime": 0,
      "endTime": 3,
      "voiceSettings": {
        "voice": "rachel",
        "speed": 1.0
      }
    }
  ]
}
```

### AI Services

#### Transcribe Audio
```http
POST /api/ai/transcribe
Authorization: Bearer <token>
Content-Type: application/json

{
  "audioUrl": "https://s3.amazonaws.com/audio.wav"
}
```

#### Generate Voiceover
```http
POST /api/ai/voiceover
Authorization: Bearer <token>
Content-Type: application/json

{
  "text": "Hello world",
  "voice": "rachel",
  "speed": 1.0,
  "emotion": "neutral"
}
```

#### Get Available Voices
```http
GET /api/ai/voices
Authorization: Bearer <token>
```

### Export

#### Export Video
```http
POST /api/export/video
Authorization: Bearer <token>
Content-Type: application/json

{
  "recordingId": "recording-id",
  "format": "mp4",
  "options": {
    "resolution": "1080p",
    "frameRate": 30,
    "includeSubtitles": true
  }
}
```

#### Export Article
```http
POST /api/export/article
Authorization: Bearer <token>
Content-Type: application/json

{
  "recordingId": "recording-id",
  "options": {
    "includeScreenshots": true,
    "format": "html"
  }
}
```

## Real-time Events

### Socket.IO Connection

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3001', {
  auth: {
    token: 'your-jwt-token'
  }
});

// Join project for collaboration
socket.emit('join-project', 'project-id');

// Listen for script edits
socket.on('script-edit-broadcast', (data) => {
  console.log('Script edited:', data);
});

// Listen for processing progress
socket.emit('subscribe-processing', 'recording-id');
socket.on('processing-progress', (data) => {
  console.log('Progress:', data.progress);
});
```

## Queue System

The backend uses Bull queues for background processing:

- **Video Processing Queue**: Handles video upload processing
- **Audio Generation Queue**: Generates AI voiceovers
- **Export Queue**: Handles video exports

### Queue Monitoring

```javascript
import { getQueueStats } from './services/queue.js';

const stats = await getQueueStats();
console.log(stats);
```

## Database Schema

### User Model
```typescript
interface IUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'editor' | 'reviewer' | 'viewer';
  organization?: string;
  preferences: {
    theme: 'light' | 'dark';
    notifications: boolean;
    autoSave: boolean;
  };
  subscription: {
    plan: 'free' | 'pro' | 'enterprise';
    status: 'active' | 'inactive' | 'cancelled';
  };
}
```

### Project Model
```typescript
interface IProject {
  title: string;
  description?: string;
  owner: ObjectId;
  collaborators: Array<{
    user: ObjectId;
    role: 'editor' | 'reviewer' | 'viewer';
  }>;
  recordings: ObjectId[];
  status: 'draft' | 'in_progress' | 'review' | 'completed';
  settings: {
    resolution: '720p' | '1080p' | '4k';
    frameRate: 30 | 60;
    audioQuality: 'standard' | 'high';
  };
}
```

### Recording Model
```typescript
interface IRecording {
  project: ObjectId;
  title: string;
  originalVideoUrl: string;
  processedVideoUrl?: string;
  duration: number;
  uiEvents: IUIEvent[];
  script: {
    segments: Array<{
      id: string;
      text: string;
      startTime: number;
      endTime: number;
      audioUrl?: string;
    }>;
  };
  visualEffects: Array<{
    type: 'blur' | 'zoom' | 'highlight';
    startTime: number;
    endTime: number;
    coordinates?: { x: number; y: number; width: number; height: number };
  }>;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
}
```

## Development

### Scripts

```bash
# Development with hot reload
npm run dev

# Build TypeScript
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Run tests
npm test
```

### Project Structure

```
backend/
├── src/
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── middleware/      # Express middleware
│   ├── utils/           # Utility functions
│   └── server.ts        # Main server file
├── logs/                # Application logs
├── package.json
├── tsconfig.json
└── README.md
```

## Deployment

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist
EXPOSE 3001

CMD ["node", "dist/server.js"]
```

### Environment Setup

1. **Production Environment Variables**
2. **Database Setup** (MongoDB Atlas recommended)
3. **Redis Setup** (Redis Cloud recommended)
4. **AWS S3 Configuration**
5. **SSL Certificate** (Let's Encrypt recommended)

### Health Checks

```http
GET /health
```

Returns:
```json
{
  "status": "OK",
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

## Security

- JWT token authentication
- Rate limiting (100 requests/minute)
- Input validation with Joi
- File upload restrictions
- CORS configuration
- Helmet security headers
- Environment variable protection

## Monitoring

- Winston logging with multiple transports
- Queue monitoring and statistics
- Performance metrics
- Error tracking and reporting

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details