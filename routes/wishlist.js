require('dotenv').config();

const express = require('express');
const router = express.Router();
BigCommerce = require('node-bigcommerce');
const Wishlist = require('../models/Wishlist.js');

const bigCommerce = new BigCommerce({
  logLevel: 'info',
  clientId: process.env.CLIENT,
  accessToken: process.env.TOKEN,
  secret: process.env.SECRET,
  storeHash: process.env.HASH,
  responseType: 'json',
  apiVersion: 'v3' // Default is v2
});

router.get('/wishlists', (req, res) => {
  Wishlist.find({}, (err, allWishlists) => {
    if (err) {
      console.log(err);
      res.redirect('/');
    } else {
      res.render('index', {
        title: 'Welcome to Whisklist | View Wishlists',
        wishlists: allWishlists
      });
    }
  });
});
router.get('/wishlists/update', (req, res) => {
  res.render('index', { message: 'Updating' });
  // Wrapping a Promise in a Promise...
  const getWishlists = new Promise(async function(resolve, reject) {
    await bigCommerce.get('/wishlists').then(data => {
      Arr = data.data;
      // Assign wishlist IDs to an Array
      let wArr = [];
      for (let [key, value] of Object.entries(Arr)) {
        if (value.items.length > 0) {
          wArr.push(value.id);
        }
      }
      // Checking the Array...
      console.log(wArr + ' wArr ');
      // This could be done with forEach but :shrug:
      for (i = 0; i < wArr.length; i++) {
        bigCommerce.get('/wishlists/' + wArr[i]).then(data => {
          wishlistsArr = [];
          wishlistsArr = data.data;
          console.log(wishlistsArr.id + 'LINE 148');

          Wishlist.collection.findOne({ id: wishlistsArr.id }, null, function(
            err,
            docs
          ) {
            if (docs === null) {
              Wishlist.collection.insertOne(data.data, function(err, res) {
                if (err) throw err;
                console.log(
                  'Number of documents inserted: ' + res.insertedCount
                );
              });
              if (err) throw err;
            } else {
              reject(err);
            }
          });
        });
      }

      return resolve();
    });
  }).catch(err => {
    console.log('getWishlists rejected' + err);
  });
  getWishlists;
});

// None of the below is used and routes are broken.
router.post('/wishlists/add', (req, res) => {
  let message = '';
  let id = req.body.id;
  let customer_id = req.body.customer_id;
  let name = req.body.name;
  let is_public = req.body.is_public;
  let items = req.body.items;

  let newWishlist = {
    id: id,
    customer_id: customer_id,
    name: name,
    is_public: is_public,
    items: items
  };
  Wishlist.create(newWishlist, (err, newlyCreated) => {
    if (err) {
      console.log(err);
    } else {
      console.log(newlyCreated);
      res.redirect('/');
    }
  });
});
router.get('/wishlists/:id', (req, res) => {
  let wishlistId = req.params.id;

  Wishlist.findById(wishlistId).exec((err, ret) => {
    if (err) {
      return res.status(500).send(err);
    }
    res.render('index', {
      title: 'Edit Wishlist',
      wishlist: ret,
      message: ''
    });
  });
});
router.post('/wishlists/edit/:id', (req, res) => {
  let wishlistId = req.params.id;

  Wishlist.findByIdAndUpdate(wishlistId, req.body).exec((err, ret) => {
    if (err) {
      return res.status(500).send(err);
    }
    res.redirect('/');
  });
});
router.get('/wishlists/delete/:id', (req, res) => {
  let wishlistId = req.params.wishlist_id;

  Wishlist.findByIdAndRemove(wishlistId, req.body).exec((err, ret) => {
    if (err) {
      return res.status(500).send(err);
    }
    res.redirect('/');
  });
});
module.exports = router;
