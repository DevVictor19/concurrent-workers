import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { QUEUES } from '../constants';
import { Job, Queue } from 'bullmq';
import { Message, MessageProps } from '../entities';
import { Logger } from '@nestjs/common';
import { MessagesService, TokenBucketService } from '../services';

@Processor(QUEUES.MESSAGE_SEND_QUEUE)
export class SendMessagesProcessor extends WorkerHost {
  private readonly logger = new Logger(SendMessagesProcessor.name);

  constructor(
    @InjectQueue(QUEUES.MESSAGE_SEND_QUEUE)
    private readonly sendMessagesQueue: Queue,
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

    await this.sendMessagesQueue.add('message', job.data, {
      jobId: job.id,
      delay: this.tokenBucketService.getTokenRequestLimitMs(),
    });
  }
}
