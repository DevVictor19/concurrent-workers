import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { MessageDto } from '../dtos';
import { Message } from '../entities/message.entity';
import { setTimeout } from 'node:timers/promises';
import { QUEUES } from '../constants';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    @InjectQueue(QUEUES.MESSAGE_SEND_QUEUE)
    private readonly sendMessagesQueue: Queue,
    private readonly configService: ConfigService,
  ) {}

  public async batchMessages(messages: MessageDto[]): Promise<void> {
    for (const m of messages) {
      const message = Message.create(m.subject, m.body, m.to);
      await this.sendMessagesQueue.add('message', message.toJSON(), {
        jobId: message.id,
      });
      this.logger.debug(`Created message with ID: ${message.id}`);
    }
  }

  public async sendMessage(message: Message, apiToken: string): Promise<void> {
    await setTimeout(2000);
    this.logger.debug(`Message sent: ${message.id} using token: ${apiToken}`);
  }
}
