import { randomUUID as uuidV4 } from 'node:crypto';

export type MessageProps = {
  id: string;
  subject: string;
  body: string;
  to: string;
  createdAt: Date;
  updatedAt: Date;
};

export class Message {
  private props: MessageProps;

  private constructor() {}

  public static create(subject: string, body: string, to: string): Message {
    const message = new Message();
    const now = new Date();

    message.props = {
      id: uuidV4(),
      subject,
      body,
      to,
      createdAt: now,
      updatedAt: now,
    };

    return message;
  }

  public static with(props: MessageProps): Message {
    const message = new Message();
    message.props = props;
    return message;
  }

  get id(): string {
    return this.props.id;
  }

  get subject(): string {
    return this.props.subject;
  }

  get body(): string {
    return this.props.body;
  }

  get to(): string {
    return this.props.to;
  }

  public toJSON(): MessageProps {
    return { ...this.props };
  }
}
