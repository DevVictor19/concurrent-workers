import { Injectable, Logger } from '@nestjs/common';
import { MessageDto } from './dtos';
import { setTimeout } from 'node:timers/promises';
import { Message } from './entities';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  async batchMessages(messages: MessageDto[]): Promise<void> {
    try {
      for (const m of messages) {
        const message = Message.create(m.subject, m.body, m.to);
        this.logger.debug(`Created message with ID: ${message.id}`);

        await setTimeout(1000);
      }
    } catch (error) {
      this.logger.error(
        'Error processing batch messages',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
