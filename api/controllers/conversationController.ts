import { RequestHandler } from "express";
import { Conversation, Chat } from "../models/Conversation";
import User from "../models/User";
import Asset from "../models/Asset";
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

    // Always ensure participants are added to the junction table
    const participantUsers = await User.findAll({
      where: { id: { [Op.in]: participants as string[] } }
    });
    
    console.log('Participant users found:', participantUsers.map(u => u.id));
    
    // Check if participants are already in the conversation
    const existingParticipants = await (conversation as any).getParticipants();
    const existingParticipantIds = existingParticipants.map((p: any) => p.id);
    
    console.log('Existing participants:', existingParticipantIds);
    
    // Add only missing participants
    const missingParticipants = participantUsers.filter(user => !existingParticipantIds.includes(user.id));
    console.log('Missing participants:', missingParticipants.map(u => u.id));
    
    if (missingParticipants.length > 0) {
      await (conversation as any).addParticipants(missingParticipants);
      console.log('Added missing participants to conversation');
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

    // First, check if the conversation exists and if the current user is a participant
    console.log('Looking for conversation:', conversationId);
    console.log('Current user ID:', req.user.id);
    
    const conversation = await Conversation.findByPk(conversationId, {
      include: [
        {
          model: User,
          as: 'participants',
          where: { id: req.user.id }
        }
      ]
    });

    console.log('Conversation found:', !!conversation);
    console.log('Participants:', (conversation as any)?.participants?.map((p: any) => p.id));

    if (!conversation) {
      throw new HttpError("Conversation not found!", HttpCode.NOT_FOUND);
    }

    // Check if current user is a participant
    const isParticipant = (conversation as any).participants?.some((participant: any) => participant.id === req.user.id);
    console.log('Is participant:', isParticipant);
    
    if (!isParticipant) {
      throw new HttpError("You are not a participant of this conversation!", HttpCode.FORBIDDEN);
    }

    // Now get the full conversation with chats and peer profile
    const fullConversation = await Conversation.findByPk(conversationId, {
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
                  model: Asset,
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
              model: Asset,
              as: 'avatar',
              attributes: ['url']
            }
          ]
        }
      ]
    });

    if (!fullConversation) {
      throw new HttpError("Details not found!", HttpCode.NOT_FOUND);
    }

    // Find the peer profile (the other participant)
    const peerProfile = (fullConversation as any).participants?.find((participant: any) => participant.id !== req.user.id);
    if (!peerProfile) {
      throw new HttpError("Peer profile not found!", HttpCode.NOT_FOUND);
    }

    const finalConversation: ConversationResponse = {
      id: fullConversation.id,
      chats: (fullConversation as any).chats?.map((chat: any) => ({
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
                  model: Asset,
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
            model: Asset,
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