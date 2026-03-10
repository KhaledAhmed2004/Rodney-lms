import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';
import { MessageService } from './message.service';
import { JwtPayload } from 'jsonwebtoken';
import { IMessageAttachment } from './message.interface';

/**
 * Build attachments array and determine message type from fileHandler output.
 * fileHandler injects file URLs into req.body as string or string[] per field.
 */
const buildAttachmentsAndType = (body: Record<string, any>) => {
  const toArray = (val: unknown): string[] =>
    Array.isArray(val) ? val : typeof val === 'string' ? [val] : [];

  const images = toArray(body.image);
  const media = toArray(body.media);
  const docs = toArray(body.doc);

  const attachments: IMessageAttachment[] = [
    ...images.map(url => ({
      type: 'image' as const,
      url,
      name: url.split('/').pop(),
    })),
    ...media.map(url => {
      const lower = url.toLowerCase();
      const isVideo = lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov');
      return {
        type: (isVideo ? 'video' : 'audio') as IMessageAttachment['type'],
        url,
        name: url.split('/').pop(),
      };
    }),
    ...docs.map(url => ({
      type: 'file' as const,
      url,
      name: url.split('/').pop(),
    })),
  ];

  const hasFiles = images.length > 0 || media.length > 0 || docs.length > 0;
  const hasMultipleTypes =
    [images.length > 0, media.length > 0, docs.length > 0, !!body.text].filter(Boolean).length > 1;

  let type: 'text' | 'image' | 'media' | 'doc' | 'mixed' = 'text';
  if (hasMultipleTypes) {
    type = 'mixed';
  } else if (images.length > 0) {
    type = 'image';
  } else if (media.length > 0) {
    type = 'media';
  } else if (docs.length > 0) {
    type = 'doc';
  }

  return { attachments, type, hasFiles };
};

const sendMessage = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as JwtPayload).id;
  const { attachments, type } = buildAttachmentsAndType(req.body);

  const payload = {
    ...req.body,
    sender: userId,
    attachments,
    type,
  };
  // Clean up raw file fields injected by fileHandler
  delete payload.image;
  delete payload.media;
  delete payload.doc;

  const message = await MessageService.sendMessageToDB(payload);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Send Message Successfully',
    data: message,
  });
});

const getMessage = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id;
  const messages = await MessageService.getMessageFromDB(
    req.user as JwtPayload,
    id,
    req.query
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Message Retrieve Successfully',
    data: messages,
  });
});

const markChatRead = catchAsync(async (req: Request, res: Response) => {
  const chatId = req.params.chatId;
  const userId = (req.user as JwtPayload).id as string;
  const result = await MessageService.markChatAsRead(chatId, userId);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Chat messages marked as read',
    data: result,
  });
});

export const MessageController = { sendMessage, getMessage, markChatRead };
