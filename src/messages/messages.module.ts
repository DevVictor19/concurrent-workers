import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { QUEUES } from './constants';
import { SendMessagesProcessor } from './processors';

@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.getOrThrow<string>('REDIS_HOST'),
          port: configService.getOrThrow<number>('REDIS_PORT'),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: QUEUES.MESSAGE_SEND_QUEUE,
    }),
  ],
  controllers: [MessagesController],
  providers: [MessagesService, SendMessagesProcessor],
})
export class MessagesModule {}
