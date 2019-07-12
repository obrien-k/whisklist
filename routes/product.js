require('dotenv').config();

const express = require('express');
const router = express.Router();
const Product = require('../models/Product.js');
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
router.get('/products', (req, res) => {
  Product.find({}, (err, allProducts) => {
    if (err) {
      console.log(err);
      res.redirect('/');
    } else {
      res.render('index', {
        title: 'Welcome to Whisklist | View Products',
        products: allProducts
      });
    }
  });
});
router.get('/products/update', (req, res) => {
  res.render('index', { message: 'Updating' });
  // Wrapping a Promise in a Promise...
  const getProducts = new Promise(async function(resolve, reject) {
    bigCommerce.get('/catalog/products').then(data => {
      Arr = data.data;
      // Assign an array for the ids that the BC API pulls for products
      let pArr = [];
      for ([key, value] of Object.entries(Arr)) {
        if (value.id) {
          pArr.push(value.id);
        }
      }
      console.log(pArr);
      // Tried wrapping this in a promise due to issues seen when pulling products multiple times, which is when the Array above was introduced, this can possibly be removed.
      // Reading through it, with my new approach this can probably be greatly reduced.

      for (i = 0; i < pArr.length; i++) {
        bigCommerce.get('/catalog/products/' + pArr[i]).then(data => {
          prodArr = [];
          prodArr = data.data;
          pId = prodArr.id;
          console.log(pId);
          // Compare the product IDs in the BC Catalog to the local mongo DB's wishlists
          Wishlist.collection.find({ 'items.product_id': pId }, null, function(
            err,
            docs
          ) {
            if (docs) {
              // Assign Array for each product ID found that's in a Wishlist
              wIdArr = [];
              docs.forEach(element => {
                for ([key, value] of Object.entries(element)) {
                  if (key === 'id' && wIdArr.includes(value) != true) {
                    wIdArr.push(value);
                  }
                }
                // Check if local mongo DB already has this product ID saved
                Product.collection.findOne({ id: pId }, null, function(
                  err,
                  docs
                ) {
                  if (err) throw err;
                  if (docs != null) {
                    console.log(pId + 'LINE 169');
                    console.log(wIdArr + 'LINE 170');
                    // This might be the source of duplication, forEach wID Array, check if the Product ID has the wishlist saved... Logic doesn't seem to indicate that though, this isn't being run multiple times from what I can tell on first glance/recollection.
                    wIdArr.forEach(element => {
                      console.log(element);
                      Product.collection.findOne(
                        { id: pId, 'wishlists.id': element },
                        null,
                        function(err, docs) {
                          if (err) throw err;
                          if (docs == null) {
                            // This point does seem to run correctly when it is, the wishlists are added as individual objects with an ID appropriately assigned.
                            Product.collection.findOneAndUpdate(
                              { id: pId },
                              { $push: { wishlists: { id: element } } },
                              function(err, docs) {
                                if (err) throw err;
                                else {
                                  console.log(
                                    'Number of inserted Products: ' +
                                      docs.insertedCount
                                  );
                                }
                              }
                            );
                          }
                          // This point also seems to run correctly when applicable.
                          if (docs != null) {
                            console.log(
                              element + ' wishlist already saved to product'
                            );
                          }
                        }
                      );
                    });
                  }
                  // No product found at all, that exists in a wishlist's items? Create it with all the data. Lots of data.
                  if (docs == null) {
                    Product.collection.insertOne(prodArr, null, function(
                      err,
                      docs
                    ) {
                      if (err) throw err;
                      if (docs) {
                        console.log(
                          'Number of inserted Products: ' + docs.insertedCount
                        );
                      }
                    });
                  }
                });
              });
              console.log(wIdArr);
            } else {
              return reject(err);
            }
          });
        });
      }
    });
    return resolve();
  }).catch(err => {
    console.log('getProducts rejected' + err);
  });
  getProducts;
});

// None of the below is used and routes are broken.
router.post('/products/add', (req, res) => {
  let message = '';
  let id = req.body.id;
  let name = req.body.name;
  let sku = req.body.sku;

  let newProduct = { id: id, name: name, sku: sku };
  Product.create(newProduct, (err, newlyCreated) => {
    if (err) {
      console.log(err);
    } else {
      console.log(newlyCreated);
      res.redirect('/');
    }
  });
});
router.get('/products/:id', (req, res) => {
  let productId = req.params.id;

  Product.findById(productId).exec((err, ret) => {
    if (err) {
      return res.status(500).send(err);
    }
    res.render('index', {
      title: 'Edit Product',
      product: ret,
      message: ''
    });
  });
});
router.post('/products/edit/:id', (req, res) => {
  let productId = req.params.id;

  Product.findByIdAndUpdate(productId, req.body).exec((err, ret) => {
    if (err) {
      return res.status(500).send(err);
    }
    res.redirect('/');
  });
});
router.get('/products/delete/:id', (req, res) => {
  let productId = req.params.product_id;

  Product.findByIdAndRemove(productId, req.body).exec((err, ret) => {
    if (err) {
      return res.status(500).send(err);
    }
    res.redirect('/');
  });
});
module.exports = router;
