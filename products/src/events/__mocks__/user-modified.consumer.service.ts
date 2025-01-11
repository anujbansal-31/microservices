import { Injectable } from '@nestjs/common';

@Injectable()
export class UserModifiedConsumer {
  onMessage = jest.fn().mockImplementation((data) => {
    console.log(`Mocked save: ${data}`);
  });
  listen = jest.fn();
}

export default UserModifiedConsumer;
