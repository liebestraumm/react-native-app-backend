'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Remove the avatar JSON column
    await queryInterface.removeColumn('users', 'avatar');
    
    // Add avatarId foreign key column
    await queryInterface.addColumn('users', 'avatarId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'assets',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove the avatarId foreign key column
    await queryInterface.removeColumn('users', 'avatarId');
    
    // Add back the avatar JSON column
    await queryInterface.addColumn('users', 'avatar', {
      type: Sequelize.JSON,
      allowNull: true,
    });
  }
}; 