import { Processor, WorkerHost } from '@nestjs/bullmq';
import { QUEUES } from '../constants';
import { Job } from 'bullmq';
import { MessageProps } from '../entities';
import { Logger } from '@nestjs/common';
import { setTimeout } from 'node:timers/promises';

@Processor(QUEUES.MESSAGE_SEND_QUEUE)
export class SendMessagesProcessor extends WorkerHost {
  private readonly logger = new Logger(SendMessagesProcessor.name);

  async process(job: Job<MessageProps>): Promise<any> {
    await setTimeout(2000);
    this.logger.debug(`Message sent: ${job.data.id}`);
  }
}
