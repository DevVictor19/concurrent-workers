export interface MessageDto {
  subject: string;
  body: string;
  to: string;
}

export interface SendMessagesRequest {
  messages: MessageDto[];
}
