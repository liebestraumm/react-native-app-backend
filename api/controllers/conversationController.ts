import { RequestHandler } from "express";
import { Conversation, Chat } from "../models/Conversation";
import User from "../models/User";
import { HttpError } from "../lib/HttpError";
import HttpCode from "../constants/httpCode";
import { Op } from "sequelize";

interface UserProfile {
  id: string;
  name: string;
  avatar?: string;
}

interface ChatResponse {
  text: string;
  time: string;
  id: string;
  user: UserProfile;
}

interface ConversationResponse {
  id: string;
  chats: ChatResponse[];
  peerProfile: { avatar?: string; name: string; id: string };
}

interface LastChatResponse {
  id: string;
  lastMessage: string;
  timestamp: Date;
  unreadChatCounts: number;
  peerProfile: {
    id: string;
    name: string;
    avatar?: string;
  };
}

// Helper function to validate UUID
const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

export const getOrCreateConversation: RequestHandler = async (req, res, next) => {
  try {
    const { peerId } = req.params;

    if (!isValidUUID(peerId)) {
      throw new HttpError("Invalid peer id!", HttpCode.UNPROCESSABLE_ENTITY);
    }

    const user = await User.findByPk(peerId);
    if (!user) {
      throw new HttpError("User not found!", HttpCode.NOT_FOUND);
    }

    const participants = [req.user.id, peerId];
    const participantsId = participants.sort().join("_");

    // Find or create conversation
    const [conversation, created] = await Conversation.findOrCreate({
      where: { participantsId },
      defaults: { participantsId }
    });

    // If conversation was just created, add participants to the junction table
    if (created) {
      // Add participants to the junction table
      const participantUsers = await User.findAll({
        where: { id: { [Op.in]: participants as string[] } }
      });
      await (conversation as any).$add('participants', participantUsers);
    }

    res.json({ conversationId: conversation.id });
  } catch (error) {
    next(error);
  }
};

export const getConversations: RequestHandler = async (req, res, next) => {
  try {
    const { conversationId } = req.params;

    if (!isValidUUID(conversationId)) {
      throw new HttpError("Invalid conversation id!", HttpCode.UNPROCESSABLE_ENTITY);
    }

    const conversation = await Conversation.findByPk(conversationId, {
      include: [
        {
          model: Chat,
          as: 'chats',
          include: [
            {
              model: User,
              as: 'sender',
              attributes: ['id', 'name'],
              include: [
                {
                  model: User,
                  as: 'avatar',
                  attributes: ['url']
                }
              ]
            }
          ],
          order: [['timestamp', 'ASC']]
        },
        {
          model: User,
          as: 'participants',
          attributes: ['id', 'name'],
          include: [
            {
              model: User,
              as: 'avatar',
              attributes: ['url']
            }
          ],
          where: {
            id: { [Op.ne]: req.user.id }
          }
        }
      ]
    });

    if (!conversation) {
      throw new HttpError("Details not found!", HttpCode.NOT_FOUND);
    }

    const peerProfile = (conversation as any).participants?.[0];
    if (!peerProfile) {
      throw new HttpError("Peer profile not found!", HttpCode.NOT_FOUND);
    }

    const finalConversation: ConversationResponse = {
      id: conversation.id,
      chats: (conversation as any).chats?.map((chat: any) => ({
        id: chat.id,
        text: chat.content,
        time: chat.timestamp.toISOString(),
        user: {
          id: chat.sender.id,
          name: chat.sender.name,
          avatar: chat.sender.avatar?.url,
        },
      })) || [],
      peerProfile: {
        id: peerProfile.id,
        name: peerProfile.name,
        avatar: peerProfile.avatar?.url,
      },
    };

    res.json({ conversation: finalConversation });
  } catch (error) {
    next(error);
  }
};

export const getLastChats: RequestHandler = async (req, res, next) => {
  try {
    // Get all conversations where the current user is a participant
    const conversations = await Conversation.findAll({
      include: [
        {
          model: User,
          as: 'participants',
          where: { id: req.user.id }
        },
        {
          model: Chat,
          as: 'chats',
          include: [
            {
              model: User,
              as: 'sender',
              attributes: ['id', 'name'],
              include: [
                {
                  model: User,
                  as: 'avatar',
                  attributes: ['url']
                }
              ]
            }
          ],
          order: [['timestamp', 'DESC']],
          limit: 1
        }
      ]
    });

    const chats: LastChatResponse[] = [];

    for (const conversation of conversations) {
      const lastChat = (conversation as any).chats?.[0];
      if (!lastChat) continue;

      // Get peer profile (the other participant)
      const peer = await User.findOne({
        include: [
          {
            model: Conversation,
            as: 'conversations',
            where: { id: conversation.id }
          },
          {
            model: User,
            as: 'avatar',
            attributes: ['url']
          }
        ],
        where: {
          id: { [Op.ne]: req.user.id as string }
        }
      });

      if (!peer) continue;

      // Count unread messages
      const unreadCount = await Chat.count({
        where: {
          conversationId: conversation.id,
          sentBy: { [Op.ne]: req.user.id as string },
          viewed: false
        }
      });

      chats.push({
        id: conversation.id,
        lastMessage: lastChat.content,
        timestamp: lastChat.timestamp,
        unreadChatCounts: unreadCount,
        peerProfile: {
          id: peer.id,
          name: peer.name,
          avatar: peer.avatar?.url,
        },
      });
    }

    res.json({ chats });
  } catch (error) {
    next(error);
  }
};

export const updateSeenStatus = async (
  peerId: string,
  conversationId: string
) => {
  await Chat.update(
    { viewed: true },
    {
      where: {
        conversationId,
        sentBy: peerId,
        viewed: false,
      },
    }
  );
};

export const updateChatSeenStatus: RequestHandler = async (req, res, next) => {
  try {
    const { peerId, conversationId } = req.params;

    if (!isValidUUID(peerId) || !isValidUUID(conversationId)) {
      throw new HttpError("Invalid conversation or peer id!", HttpCode.UNPROCESSABLE_ENTITY);
    }

    await updateSeenStatus(peerId, conversationId);

    res.json({ message: "Updated successfully." });
  } catch (error) {
    next(error);
  }
};