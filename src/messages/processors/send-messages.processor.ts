import { Processor, WorkerHost } from '@nestjs/bullmq';
import { QUEUES } from '../constants';
import { Job } from 'bullmq';
import { Message, MessageProps } from '../entities';
import { Logger } from '@nestjs/common';
import { MessagesService, TokenBucketService } from '../services';

@Processor(QUEUES.MESSAGE_SEND_QUEUE)
export class SendMessagesProcessor extends WorkerHost {
  private readonly logger = new Logger(SendMessagesProcessor.name);

  constructor(
    private readonly tokenBucketService: TokenBucketService,
    private readonly messagesService: MessagesService,
  ) {
    super();
  }

  async process(job: Job<MessageProps>): Promise<any> {
    const availableToken = await this.tokenBucketService.getAvailableToken();

    if (availableToken) {
      await this.messagesService.sendMessage(
        Message.with(job.data),
        availableToken,
      );
      return;
    }

    this.logger.warn(
      `No available API tokens for message ID: ${job.data.id}. Re-queuing...`,
    );

    throw new Error('No available API tokens');
  }
}
