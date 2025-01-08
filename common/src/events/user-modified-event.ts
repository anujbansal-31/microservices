import { Topics } from './topics';

export interface UserModifiedEvent {
  subject: Topics.UserModified;
  data: {
    id: string;
    name: string;
    hashedRt: number;
    status: string;
    updatedAt: number;
  };
}
