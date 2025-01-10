import { Injectable } from '@nestjs/common';

@Injectable()
export class UserModifiedProducer {
  publish = jest.fn().mockImplementation((data) => {
    console.log(`Mocked save: ${data}`);
  });
}
