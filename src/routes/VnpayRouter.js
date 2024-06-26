/**
 * Created by CTT VNPAY
 */



let express = require('express');
let router = express.Router();
let $ = require('jquery');
const request = require('request');
const moment = require('moment');
const dotenv = require('dotenv');
const Order = require('../models/OrderModel');
const OrderService = require('../services/OrderService')
const { ObjectId } = require('mongodb');

dotenv.config()


router.post('/create_payment_url', function (req, res, next) {

    process.env.TZ = 'Asia/Ho_Chi_Minh';

    let date = new Date();
    let createDate = moment(date).format('YYYYMMDDHHmmss');

    let ipAddr = req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress;

    // let config = require('../config/default.json');

    let tmnCode = process.env.vnp_TmnCode;
    let secretKey = process.env.vnp_HashSecret;
    let vnpUrl = process.env.vnp_Url;
    let returnUrl = process.env.vnp_ReturnUrl;
    console.log(returnUrl)
    let orderId = req.body.id;
    console.log(req.body.id)
    let amount = req.body.amount;
    console.log(orderId, amount)
    let bankCode = '';

    let locale = 'vn';
    if (locale === null || locale === '') {
        locale = 'vn';
    }
    let currCode = 'VND';
    let vnp_Params = {};
    vnp_Params['vnp_Version'] = '2.1.0';
    vnp_Params['vnp_Command'] = 'pay';
    vnp_Params['vnp_TmnCode'] = tmnCode;
    vnp_Params['vnp_Locale'] = locale;
    vnp_Params['vnp_CurrCode'] = currCode;
    vnp_Params['vnp_TxnRef'] = orderId;
    vnp_Params['vnp_OrderInfo'] = 'Thanh toan cho ma GD:' + orderId;
    vnp_Params['vnp_OrderType'] = 'other';
    vnp_Params['vnp_Amount'] = amount * 100;
    vnp_Params['vnp_ReturnUrl'] = returnUrl;
    vnp_Params['vnp_IpAddr'] = ipAddr;
    vnp_Params['vnp_CreateDate'] = createDate;
    if (bankCode !== null && bankCode !== '') {
        vnp_Params['vnp_BankCode'] = bankCode;
    }

    vnp_Params = sortObject(vnp_Params);

    let querystring = require('qs');
    let signData = querystring.stringify(vnp_Params, { encode: false });
    let crypto = require("crypto");
    let hmac = crypto.createHmac("sha512", secretKey);
    let signed = hmac.update(new Buffer(signData, 'utf-8')).digest("hex");
    vnp_Params['vnp_SecureHash'] = signed;
    vnpUrl += '?' + querystring.stringify(vnp_Params, { encode: false });

    return res.status(200).json({
        status: 'OK',
        data: vnpUrl
    })
});

router.post('/vnpay_return', async function (req, res, next) {
    console.log("da vao day")
    let vnp_Params = req.body;

    let secureHash = vnp_Params['vnp_SecureHash'];

    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    vnp_Params = sortObject(vnp_Params);
    let tmnCode = process.env.vnp_TmnCode;
    let secretKey = process.env.vnp_HashSecret;
    // let vnpUrl = process.env.vnp_Url;
    // let returnUrl = process.env.vnp_ReturnUrl;
    let querystring = require('qs');
    let signData = querystring.stringify(vnp_Params, { encode: false });
    let crypto = require("crypto");
    let hmac = crypto.createHmac("sha512", secretKey);
    let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");

    if (secureHash === signed) {
        //Kiem tra xem du lieu trong db co hop le hay khong va thong bao ket qua
        try {
            const order = await Order.findOneAndUpdate(
                { _id: vnp_Params['vnp_TxnRef'], isPaid: false },
                // Dữ liệu mới sẽ được cập nhật
                {
                    isPaid: true,
                    paidAt: new Date(), // Thời điểm hiện tại
                },
                // Cài đặt để nhận lại đối tượng đã cập nhật mới
                { new: true }
            );


            // return updatedOrder;
        } catch (error) {
            return res.status(404).json({
                status: 'ERR'

            })
        }
        const order = await Order.findById(vnp_Params['vnp_TxnRef']);
        return res.status(200).json({
            status: 'OK',
            data: order

        })

    } else {
        await Order.findOneAndDelete({ _id: vnp_Params['vnp_TxnRef'], isPaid: false });

        return res.status(404).json({
            status: 'ERR'

        })
    }
});


router.post('/vnpay_ipn', async function (req, res, next) {
    let vnp_Params = req.body.vnp_Params;
    console.log(vnp_Params)
    const order = req.body.order;
    console.log("order", order.uuid)
    let secureHash = vnp_Params['vnp_SecureHash'];

    let orderId = vnp_Params['vnp_TxnRef'];
    let rspCode = vnp_Params['vnp_ResponseCode'];

    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    vnp_Params = sortObject(vnp_Params);
    // let config = require('config');
    let secretKey = process.env.vnp_HashSecret;
    let querystring = require('qs');
    let signData = querystring.stringify(vnp_Params, { encode: false });
    let crypto = require("crypto");
    let hmac = crypto.createHmac("sha512", secretKey);
    let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");
    console.log(signed)
    let paymentStatus = '0'; // Giả sử '0' là trạng thái khởi tạo giao dịch, chưa có IPN. Trạng thái này được lưu khi yêu cầu thanh toán chuyển hướng sang Cổng thanh toán VNPAY tại đầu khởi tạo đơn hàng.
    //let paymentStatus = '1'; // Giả sử '1' là trạng thái thành công bạn cập nhật sau IPN được gọi và trả kết quả về nó
    //let paymentStatus = '2'; // Giả sử '2' là trạng thái thất bại bạn cập nhật sau IPN được gọi và trả kết quả về nó

    let checkOrderId = vnp_Params['vnp_TxnRef'] === order.uuid; // Mã đơn hàng "giá trị của vnp_TxnRef" VNPAY phản hồi tồn tại trong CSDL của bạn
    let checkAmount = ((vnp_Params['vnp_Amount'] / 100) === order.totalPrice); // Kiểm tra số tiền "giá trị của vnp_Amout/100" trùng khớp với số tiền của đơn hàng trong CSDL của bạn
    // console.log(checkAmount)
    if (secureHash === signed) { //kiểm tra checksum
        if (checkOrderId) {
            if (checkAmount) {
                if (paymentStatus == "0") { //kiểm tra tình trạng giao dịch trước khi cập nhật tình trạng thanh toán
                    if (rspCode == "00") {
                        //thanh cong
                        //paymentStatus = '1'
                        // Ở đây cập nhật trạng thái giao dịch thanh toán thành công vào CSDL của bạn
                        const existingOrder = await Order.findById(order?.uuid)

                        if (!existingOrder) {
                            const newOrder = await OrderService.createOrder(
                                {
                                    id: order.uuid,
                                    orderItems: order.orderItemsSlected,
                                    paymentMethod: order.paymentMethod,
                                    itemsPrice: order.itemsPrice,
                                    shippingPrice: order.shippingPrice,
                                    totalPrice: order.totalPrice,
                                    fullName: order.shippingAddress.fullName,
                                    address: order.shippingAddress.address,
                                    city: order.shippingAddress.city,
                                    district: order.shippingAddress.district,
                                    ward: order.shippingAddress.ward,
                                    phone: order.shippingAddress.phone,
                                    user: order.user,
                                    isPaid: true,
                                    paidAt: new Date().toISOString(),
                                    delivery: order.delivery
                                }
                            )
                            res.status(200).json({ RspCode: '00', Message: 'Success', data: newOrder.data })
                        }
                        else
                            res.status(200).json({ RspCode: '00', Message: 'Success', data: existingOrder })

                    }
                    else {
                        //that bai
                        //paymentStatus = '2'
                        // Ở đây cập nhật trạng thái giao dịch thanh toán thất bại vào CSDL của bạn
                        res.status(200).json({ RspCode: '01', Message: 'Giao dịch thất bại' })
                    }
                }
                else {
                    res.status(200).json({ RspCode: '02', Message: 'This order has been updated to the payment status' })
                }
            }
            else {
                res.status(200).json({ RspCode: '04', Message: 'Amount invalid' })
            }
        }
        else {
            res.status(200).json({ RspCode: '01', Message: 'Order not found' })
        }
    }
    else {
        res.status(200).json({ RspCode: '97', Message: 'Checksum failed' })
    }
});


function sortObject(obj) {
    let sorted = {};
    let str = [];
    let key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) {
            str.push(encodeURIComponent(key));
        }
    }
    str.sort();
    for (key = 0; key < str.length; key++) {
        sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
    }
    return sorted;
}

module.exports = router;