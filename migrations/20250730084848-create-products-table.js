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
    await queryInterface.createTable("products", {
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
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      category: {
        type: Sequelize.ENUM(
          'Electronics',
          'Fashion',
          'Fitness',
          'Home & Kitchen',
          'Books',
          'Toys & Games',
          'Beauty & Personal Care',
          'Sports & Outdoors',
          'Automotive',
          'Tools & Home Improvement'
        ),
        allowNull: false,
      },
      purchasingDate: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      images: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: [],
      },
      thumbnail: {
        type: Sequelize.STRING,
        allowNull: true,
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
    await queryInterface.addIndex("products", ["user_id"], {
      name: "products_user_id_idx"
    });
    await queryInterface.addIndex("products", ["category"], {
      name: "products_category_idx"
    });
    await queryInterface.addIndex("products", ["createdAt"], {
      name: "products_created_at_idx"
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
    await queryInterface.removeIndex("products", "products_user_id_idx");
    await queryInterface.removeIndex("products", "products_category_idx");
    await queryInterface.removeIndex("products", "products_created_at_idx");
    // Then drop the table
    await queryInterface.dropTable("products");
  },
}; 