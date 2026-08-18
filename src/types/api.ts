export interface Blog {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  thumbnail: string | null;
  status: 'draft' | 'published';
  viewCount: number;
  publishedAt: string | null;
  categories: BlogCategory[];
  createdAt: string;
  updatedAt: string;
}

export interface BlogCategory {
  id: number;
  name: string;
  slug: string;
  color: string;
  description: string | null;
}

export interface Project {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  detailContent: string | null;
  techStack: string[] | null;
  githubUrl: string | null;
  demoUrl: string | null;
  thumbnail: string | null;
  hasDetail: boolean;
  order: number;
  status: 'active' | 'archived' | 'in_progress';
  completedAt: string | null;
}

export interface Contact {
  id: number;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface AboutSection {
  id: number;
  key: string;
  content: string;
  label: string | null;
  updatedAt: string;
}

export interface Skill {
  id: number;
  name: string;
  category: string;
  level: number | null;
  icon: string | null;
  order: number;
  isVisible: boolean;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}
