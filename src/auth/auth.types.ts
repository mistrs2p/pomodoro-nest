export type AuthenticatedUser = {
  id: number;
  email: string;
};

export type SocialAuthUser = {
  email: string;
  name: string;
  provider: 'google' | 'github';
};

export type AuthenticatedRequest = {
  user: AuthenticatedUser;
};

export type SocialAuthRequest = {
  user: SocialAuthUser;
};
