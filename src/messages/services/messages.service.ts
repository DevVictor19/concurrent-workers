import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { MessageDto } from '../dtos';
import { Message } from '../entities/message.entity';
import { setTimeout } from 'node:timers/promises';
import { QUEUES } from '../constants';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    @InjectQueue(QUEUES.MESSAGE_SEND_QUEUE)
    private readonly sendMessagesQueue: Queue,
  ) {}

  public async batchMessages(messages: MessageDto[]): Promise<void> {
    for (const m of messages) {
      const message = Message.create(m.subject, m.body, m.to);
      await this.sendMessagesQueue.add('message', message.toJSON(), {
        attempts: 10,
        backoff: {
          type: 'fixed',
          delay: 6000,
        },
      });
      this.logger.debug(`Created message with ID: ${message.id}`);
    }
  }

  public async sendMessage(message: Message, apiToken: string): Promise<void> {
    await setTimeout(2000);
    this.logger.debug(`Message sent using token: ${apiToken}`);
  }
}
