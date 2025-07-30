export interface IUserDocument {
    id: string;
    email: string;
    password: string;
    name: string;
    verified: boolean;
    tokens: string[];
    avatarId?: string;
    avatar?: {
      id: string;
      url: string;
    };
    createdAt: Date;
    updatedAt: Date;
}