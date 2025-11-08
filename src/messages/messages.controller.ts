import { Body, Controller, Post } from '@nestjs/common';
import { MessagesService } from './messages.service';
import type { SendMessagesRequest } from './dtos';

@Controller({
  path: 'messages',
  version: '1',
})
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post('batch')
  batchMessages(@Body() body: SendMessagesRequest): void {
    void this.messagesService.batchMessages(body.messages);
  }
}
