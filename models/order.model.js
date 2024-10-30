// models/order.model.js
import { DataTypes } from 'sequelize';
import sequelize from '../db'; // Adjust this path if necessary

const Order = sequelize.define('Order', {
    order_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    table_number: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    subtotal: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    tax: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    discount: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    total_amount: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    payment_status: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    order_status: {
        type: DataTypes.STRING,
        allowNull: false,
    },
});

// Make sure to export Order as the default export
export default Order;
