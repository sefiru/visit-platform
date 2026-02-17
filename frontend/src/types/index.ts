export interface User {
  id: number;
  email: string;
  name: string;
  company_name: string;
  role: 'user' | 'admin';
}

export interface VisitCard {
  id: number;
  title: string;
  description: string;
  logo_url?: string;
  domain?: string;
  telegram_bot_token?: string;
  view_count: number;
  bot_view_count: number;
  user?: User;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface VisitCardResponse {
  visit_card: VisitCard;
}

export interface VisitCardsResponse {
  visit_cards: VisitCard[];
  pagination: PaginationInfo;
}

export interface UsersResponse {
  users: User[];
}

export interface AdminStats {
  totalUsers: number;
  totalVisitCards: number;
  totalViews: number;
  totalBotInteractions: number;
}

export interface CardStatistic {
  id: number;
  title: string;
  view_count: number;
  bot_view_count: number;
  user?: User;
}

export interface StatisticsResponse {
  all_stats: CardStatistic[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  companyName: string;
}

export interface RegisterResponse {
  token: string;
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}

export interface CreateVisitCardRequest {
  title: string;
  description: string;
  logo_url?: string;
  domain?: string;
  telegram_bot_token?: string;
}

export interface UpdateVisitCardRequest extends CreateVisitCardRequest {}

export interface UpdateUserRequest {
  name: string;
  email: string;
  company_name: string;
  role: 'user' | 'admin';
}
