import { Model, DataTypes } from "sequelize";
import { sequelize } from "../db";

export interface IChatAttributes {
  id?: string;
  conversationId: string;
  sentBy: string;
  content: string;
  timestamp: Date;
  viewed: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IConversationAttributes {
  id?: string;
  participantsId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IConversationInstance extends Model<IConversationAttributes>, IConversationAttributes {
  participants?: any[];
  chats?: IChatAttributes[];
}

export interface IChatInstance extends Model<IChatAttributes>, IChatAttributes {
  conversation?: any;
  sender?: any;
}

class Conversation extends Model<IConversationAttributes, Omit<IConversationAttributes, 'id'>> implements IConversationAttributes {
  public id!: string;
  public participantsId!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public static associate(models: any) {
    // Many-to-many relationship: Many conversations can have many users (participants)
    Conversation.belongsToMany(models.User, {
      through: 'conversation_participants',
      foreignKey: 'conversationId',
      otherKey: 'userId',
      as: 'participants',
    });

    // One-to-many relationship: One conversation can have many chats
    Conversation.hasMany(models.Chat, {
      foreignKey: 'conversationId',
      as: 'chats',
    });
  }
}

class Chat extends Model<IChatAttributes, Omit<IChatAttributes, 'id'>> implements IChatAttributes {
  public id!: string;
  public conversationId!: string;
  public sentBy!: string;
  public content!: string;
  public timestamp!: Date;
  public viewed!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public static associate(models: any) {
    // Many-to-one relationship: Many chats can belong to one conversation
    Chat.belongsTo(models.Conversation, {
      foreignKey: 'conversationId',
      as: 'conversation',
    });

    // Many-to-one relationship: Many chats can be sent by one user
    Chat.belongsTo(models.User, {
      foreignKey: 'sentBy',
      as: 'sender',
    });
  }
}

Conversation.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    participantsId: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
  },
  {
    sequelize,
    tableName: "conversations",
    timestamps: true,
  }
);

Chat.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    conversationId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'conversations',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    sentBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    timestamp: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    viewed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    sequelize,
    tableName: "chats",
    timestamps: true,
  }
);

export { Conversation, Chat };
export default Conversation;