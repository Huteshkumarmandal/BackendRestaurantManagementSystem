const { DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // Adjust the path as needed

const OrderItem = sequelize.define('OrderItem', {
    order_item_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    order_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'orders',
            key: 'order_id',
        },
        allowNull: false,
    },
    menu_item_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
}, {
    tableName: 'order_items',
    timestamps: false,
});

module.exports = OrderItem;
