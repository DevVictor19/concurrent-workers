import { Body, Controller, Post } from '@nestjs/common';
import type { SendMessagesRequest } from './dtos';
import { MessagesService } from './services';

@Controller({
  path: 'messages',
  version: '1',
})
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post('batch')
  async batchMessages(@Body() body: SendMessagesRequest): Promise<void> {
    await this.messagesService.batchMessages(body.messages);
  }
}
