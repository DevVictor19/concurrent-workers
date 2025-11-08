import { Injectable, Logger } from '@nestjs/common';
import { MessageDto } from './dtos';
import { Message } from './entities';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { QUEUES } from './constants';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    @InjectQueue(QUEUES.MESSAGE_SEND_QUEUE)
    private readonly sendMessagesQueue: Queue,
  ) {}

  async batchMessages(messages: MessageDto[]): Promise<void> {
    for (const m of messages) {
      const message = Message.create(m.subject, m.body, m.to);
      await this.sendMessagesQueue.add('message', message.toJSON(), {
        jobId: message.id,
      });
      this.logger.debug(`Created message with ID: ${message.id}`);
    }
  }
}
