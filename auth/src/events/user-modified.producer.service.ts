import { Injectable } from '@nestjs/common';

import { Producer, Topics, UserModifiedEvent } from '@microservicess/common';

@Injectable()
export class UserModifiedProducer extends Producer<UserModifiedEvent> {
  readonly topic = Topics.UserModified;
}
