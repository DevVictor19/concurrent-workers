import { Module } from '@nestjs/common';
import { MessagesModule } from './messages/messages.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MessagesModule,
  ],
})
export class AppModule {}
