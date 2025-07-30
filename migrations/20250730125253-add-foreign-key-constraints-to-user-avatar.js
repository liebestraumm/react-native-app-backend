'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // First, remove the existing avatarId column if it exists without proper constraints
    await queryInterface.removeColumn('users', 'avatarId');
    
    // Then add it back with proper foreign key constraints
    await queryInterface.addColumn('users', 'avatarId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'assets',
        key: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove the avatarId column
    await queryInterface.removeColumn('users', 'avatarId');
    
    // Add it back without constraints (original state)
    await queryInterface.addColumn('users', 'avatarId', {
      type: Sequelize.UUID,
      allowNull: true,
    });
  }
};
