import { Topics } from './topics';

export interface UserModifiedEvent {
  topic: Topics.UserModified;
  data: {
    id: string;
    name: string;
    email: string;
    hashedRt: string;
    status: string;
    updatedAt: string;
  };
}
