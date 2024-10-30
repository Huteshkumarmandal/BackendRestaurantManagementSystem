// models/Menu.js
const { Model, DataTypes } = require('sequelize');
const sequelize = require('../db'); // adjust the path as needed

class Menu extends Model {}

Menu.init({
    // Define your model attributes
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    price: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    // Other attributes...
}, {
    sequelize,
    modelName: 'Menu',
    tableName: 'menus', // make sure this matches your table name
});

module.exports = Menu;
