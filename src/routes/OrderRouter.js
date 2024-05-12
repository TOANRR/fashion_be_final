const express = require("express");
const router = express.Router()
const OrderController = require('../controllers/OrderController');
const { authMiddleWare, authUserMiddleWare } = require("../middleware/AuthMiddleware");

router.post('/create/:id', authUserMiddleWare, OrderController.createOrder)
router.get('/get-all-order/:id', authUserMiddleWare, OrderController.getAllOrderDetails)
router.get('/get-details-order/:id', OrderController.getDetailsOrder)
router.delete('/cancel-order/:id', authUserMiddleWare, OrderController.cancelOrderDetails)
router.delete('/delete-order', authMiddleWare, OrderController.deleteOrderDetails)

router.get('/get-all-order', authMiddleWare, OrderController.getAllOrder)
router.post('/check-order', OrderController.checkProductOrderedByUser)
router.post('/update-order/:id', authMiddleWare, OrderController.updateOrder)

module.exports = router