"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.createTable("password_reset_tokens", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      token: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Add indexes with custom names to avoid conflicts
    await queryInterface.addIndex("password_reset_tokens", ["user_id"], {
      name: "password_reset_tokens_user_id_idx"
    });
    await queryInterface.addIndex("password_reset_tokens", ["createdAt"], {
      name: "password_reset_tokens_created_at_idx"
    });
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    // Remove indexes first
    await queryInterface.removeIndex("password_reset_tokens", "password_reset_tokens_user_id_idx");
    await queryInterface.removeIndex("password_reset_tokens", "password_reset_tokens_created_at_idx");
    // Then drop the table
    await queryInterface.dropTable("password_reset_tokens");
  },
}; 