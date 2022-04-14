const { Op } = require('sequelize');
const Product = require('../models/Product');
const Category = require('../models/Category');

module.exports = {
  add: async (req, res) => {
    try {
      await Product.create({ ...req.body, stock_in_unit: req.body.stock * req.body.volume });

      res.status(201).send('Product created successfully!');
    } catch (err) {
      res.status(500).send(err);
    }
  },
  all: async (req, res) => {
    try {
      const products = await Product.findAll({ include: Category });

      res.status(200).send(products);
    } catch (err) {
      res.status(500).send(err);
    }
  },
  query: async (req, res) => {
    try {
      const { name, category, limit, offset, appearance, sort, gte, lte, between } = req.body;

      const query = {
        limit,
        offset,
      };

      if (name) {
        query.where = { ...query.where, name: { [Op.substring]: name } };
      }

      if (category) {
        query.where = { ...query.where, categoryId: category };
      }

      if (appearance) {
        query.where = { ...query.where, appearance };
      }

      if (sort) {
        query.order = [sort.split(',')];
      }

      if (gte) {
        query.where = { ...query.where, price_sell: { [Op.gte]: gte } };
      }

      if (lte) {
        query.where = { ...query.where, price_sell: { [Op.lte]: lte } };
      }

      if (between) {
        query.where = { ...query.where, price_sell: { [Op.between]: between } };
      }

      const products = await Product.findAll({
        ...query,
        include: Category,
      });

      const length = await Product.count(({ where } = query));

      res.status(200).send({ products, length });
    } catch (err) {
      console.log(err);
      res.status(500).send(err);
    }
  },
  appearence: async (req, res) => {
    try {
      const appearances = await Product.findAll({
        attributes: ['appearance'],
        group: 'appearance',
      });

      res.status(200).send(appearances);
    } catch (err) {
      res.status(500).send(err);
    }
  },
};