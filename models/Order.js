// models/Order.js
const { Model, DataTypes } = require('sequelize');
const sequelize = require('../db'); // adjust the path as needed

class Order extends Model {}

Order.init({
    // Define your model attributes
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    menuId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'menus', // refers to the Menu table
            key: 'id',
        }
    },
    customerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    // Other attributes...
}, {
    sequelize,
    modelName: 'Order',
    tableName: 'orders', // make sure this matches your table name
});

module.exports = Order;
