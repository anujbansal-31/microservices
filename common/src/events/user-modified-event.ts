import { Topics } from './topics';

export enum UserStatus {
  Active = 'ACTIVE',
  Inactive = 'INACTIVE',
}

export interface UserModifiedEvent {
  topic: Topics.UserModified;
  data: {
    id: string;
    name: string;
    email: string;
    hashedRt: string;
    status: UserStatus;
    updatedAt: string;
  };
}
