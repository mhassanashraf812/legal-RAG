import { createUIMessageStream, createUIMessageStreamResponse, generateId } from 'ai';

export function createOffTopicStreamResponse(
  message: string,
  originalMessages?: unknown[]
) {
  return createUIMessageStreamResponse({
    stream: createUIMessageStream({
      originalMessages: originalMessages as never,
      execute: ({ writer }) => {
        const textId = generateId();
        writer.write({ type: 'start' });
        writer.write({ type: 'text-start', id: textId });
        writer.write({ type: 'text-delta', id: textId, delta: message });
        writer.write({ type: 'text-end', id: textId });
        writer.write({ type: 'finish', finishReason: 'content-filter' });
      },
    }),
  });
}
