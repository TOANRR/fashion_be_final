const Product = require('../models/ProductModel')
const ProductService = require('../services/ProductService')
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config()
const createProduct = async (req, res) => {
    try {
        const { name, images, type, category, price, description, sizes, discount } = req.body
        // console.log(req.body)
        if (!name || images.lenght === 0 || !type || !category || !price || !description || !discount || !sizes) {
            return res.status(200).json({
                status: 'ERR',
                message: 'The input is required'
            })
        }
        else {
            const response = await ProductService.createProduct(req.body)
            return res.status(200).json(response)
        }

    } catch (e) {
        return res.status(404).json({
            message: e
        })
    }
}

const updateProduct = async (req, res) => {
    try {
        const productId = req.params.id
        const data = req.body
        if (!productId) {
            return res.status(200).json({
                status: 'ERR',
                message: 'The productId is required'
            })
        }
        const response = await ProductService.updateProduct(productId, data)
        return res.status(200).json(response)
    } catch (e) {
        return res.status(404).json({
            message: e
        })
    }
}

const getDetailsProduct = async (req, res) => {
    try {
        const productId = req.params.id
        if (!productId) {
            return res.status(200).json({
                status: 'ERR',
                message: 'The productId is required'
            })
        }
        const response = await ProductService.getDetailsProduct(productId)
        return res.status(200).json(response)
    } catch (e) {
        return res.status(404).json({
            message: e
        })
    }
}
const getDetailsProductAdmin = async (req, res) => {
    try {
        const productId = req.params.id
        if (!productId) {
            return res.status(200).json({
                status: 'ERR',
                message: 'The productId is required'
            })
        }
        const response = await ProductService.getDetailsProductAdmin(productId)
        return res.status(200).json(response)
    } catch (e) {
        return res.status(404).json({
            message: e
        })
    }
}

const deleteProduct = async (req, res) => {
    try {
        const productId = req.params.id
        if (!productId) {
            return res.status(200).json({
                status: 'ERR',
                message: 'The productId is required'
            })
        }
        const response = await ProductService.deleteProduct(productId)
        return res.status(200).json(response)
    } catch (e) {
        return res.status(404).json({
            message: e
        })
    }
}

const deleteMany = async (req, res) => {
    try {
        const ids = req.body.ids
        if (!ids) {
            return res.status(200).json({
                status: 'ERR',
                message: 'The ids is required'
            })
        }
        const response = await ProductService.deleteManyProduct(ids)
        return res.status(200).json(response)
    } catch (e) {
        return res.status(404).json({
            message: e
        })
    }
}

const findManyByObj = async (req, res) => {
    try {
        const ids = req.body.ids
        const { limit } = req.query
        const page = 0;

        if (ids?.lenght < 0) {
            return res.status(200).json({
                status: 'ERR',
                message: 'The ids is required'
            })
        }
        const response = await ProductService.findManyByObj(limit, page, ids)
        return res.status(200).json(response)
    } catch (e) {
        return res.status(404).json({
            message: e
        })
    }
}

const getAllProduct = async (req, res) => {
    try {
        const { limit, page, sort, filter } = req.query
        const response = await ProductService.getAllProduct(Number(limit) || null, Number(page) || 0, sort, filter)
        return res.status(200).json(response)
    } catch (e) {
        return res.status(404).json({
            message: e
        })
    }
}

const getAllType = async (req, res) => {
    try {
        const response = await ProductService.getAllType()
        return res.status(200).json(response)
    } catch (e) {
        return res.status(404).json({
            message: e
        })
    }
}
const getTypeCategories = async (req, res) => {

    try {
        const typesCategories = await Product.aggregate([
            { $group: { _id: '$type', categories: { $addToSet: '$category' } } },
            { $sort: { 'categories': 1 } }
        ]);

        const result = typesCategories.map(item => ({
            type: item._id,
            categories: item.categories.sort() // Sắp xếp categories trong mỗi nhóm theo thứ tự bảng chữ cái
        }));

        res.status(200).json(result);
    } catch (err) {
        console.error('Error fetching types and categories:', err);
        res.status(404).json({ message: 'Server Error' });
    }
};

const filterProduct = async (req, res) => {
    try {
        // console.log(req.body)
        let filters = {};

        // Parse and apply price range filter
        if (req.body.priceRange) {
            // const [minPrice, maxPrice] = req.body.priceRange.split('-');
            const minPrice = req.body.priceRange[0];
            const maxPrice = req.body.priceRange[1]
            // console.log(minPrice, maxPrice)
            filters.price = { $gte: minPrice, $lte: maxPrice };
        }

        // Parse and apply type and category filter
        // console.log(req.body.typeCategory)
        if (req.body.typeCategory && req.body.typeCategory.length > 0) {
            const typeCategories = req.body.typeCategory;
            filters.$or = typeCategories.map(tc => {
                const [type, category] = tc.split('_');
                return { type, category };
            });
        }
        // Find total count of products based on filters
        const totalCount = await Product.countDocuments(filters);
        // Phân trang: Số trang (page) và số mục trên mỗi trang (limit) được truyền qua query string
        const page = parseInt(req.body.page) || 1;
        const limit = parseInt(req.body.limit) || 9;

        // Tính toán số lượng bản ghi bỏ qua để bắt đầu từ trang cụ thể
        const skip = (page - 1) * limit;

        // Find products based on filters
        let query = Product.find(filters);

        // Thêm phân trang bằng cách sử dụng phép toán skip và limit
        query = query.skip(skip).limit(limit);

        // Sort products based on sortBy query parameter
        if (req.body.sortBy) {
            switch (req.body.sortBy) {
                case 'price_low_to_high':
                    query = query.sort({ price: 1 });
                    break;
                case 'price_high_to_low':
                    query = query.sort({ price: -1 });
                    break;
                case 'name_A_to_Z':
                    query = query.sort({ name: 1 });
                    break;
                case 'name_Z_to_A':
                    query = query.sort({ name: -1 });
                    break;
                default:
                    // Default sorting
                    break;
            }
        }

        // Execute the query

        const products = await query.exec();

        const totalPages = Math.ceil(totalCount / limit);

        res.status(200).json({ totalPages, products });
    } catch (err) {
        console.error('Error fetching products:', err);
        res.status(404).json({ message: 'Server Error' });
    }
}
const getProductByType = async (req, res) => {
    try {
        const type = req.params.type; // Lấy giá trị type từ URL
        // Sử dụng phương thức find để lấy danh sách sản phẩm theo type
        const products = await Product.find({ type: type }).sort({ createdAt: -1 });

        res.status(200).json(products); // Trả về danh sách sản phẩm dưới dạng JSON
    } catch (error) {
        console.error('Error getting products by type:', error);
        res.status(404).json({ message: 'Server error' }); // Trả về lỗi 500 nếu có vấn đề xảy ra
    }
};
const getProductByCategory = async (req, res) => {
    try {
        const category = req.params.category; // Lấy giá trị type từ URL
        const type = req.query.type;
        // Sử dụng phương thức find để lấy danh sách sản phẩm theo type
        const products = await Product.find({ type: type, category: category }).sort({ createdAt: -1 });
        // console.log(products)
        res.status(200).json(products); // Trả về danh sách sản phẩm dưới dạng JSON
    } catch (error) {
        console.error('Error getting products by type:', error);
        res.status(404).json({ message: 'Server error' }); // Trả về lỗi 500 nếu có vấn đề xảy ra
    }
};
const getCategories = async (req, res) => {
    try {
        // Sử dụng phương thức distinct của MongoDB để lấy tất cả các giá trị duy nhất của trường "type" từ tất cả các sản phẩm
        const categories = await Product.distinct('category');

        res.status(200).json(categories);
    } catch (error) {
        console.error('Error fetching unique categories:', error);
        res.status(404).json({ message: 'Server Error' });
    }
}
const searchImage = async (req, res) => {
    try {
        // Send POST request to Python server

        const response = await axios.post(`${process.env.Flask_Server}/image`, {
            query_img: req.body.query_img
        });

        // Extract IDs from the response
        const { data } = response.data;

        console.log(data)

        if (!data || !Array.isArray(data)) {
            throw new Error('Invalid response format');
        }

        // Find products in MongoDB based on the IDs in the response
        const products = await Product.find({ _id: { $in: data } });

        // Create an object to store the products in the order of appearance
        const productsInOrder = [];
        for (let i = 0; i < data.length; i++) {
            const id = data[i];
            const product = products.find(p => p._id.toString() === id);
            if (product) {
                productsInOrder.push(product);
            }
        }
        // console.log(productsInOrder)
        // Send the products in the order of appearance
        res.json({ products: productsInOrder, status: 'OK' });
    } catch (error) {
        console.error('Error:', error);
        res.status(404).json({ message: 'Internal server error' });
    }
};
const getTotalProducts = async (req, res) => {
    try {
        const totalProducts = await Product.countDocuments();
        res.json({ totalProducts });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
async function searchProducts(req, res) {
    const { query } = req.query;

    try {
        const keywords = query.split(" ");
        // Tạo một mảng chứa các biểu thức chính quy để tìm từng từ khóa trong mỗi trường
        const results = await Product.find(
            { $text: { $search: query } }, // Tìm kiếm gần đúng
            { score: { $meta: "textScore" } } // Lấy điểm số của kết quả
        )
            .sort({ score: { $meta: "textScore" } }); // Sắp xếp theo điểm số giảm dần

        // Lọc kết quả chỉ lấy những sản phẩm có đủ các từ trong từ khóa tìm kiếm
        const filteredResults = results.filter(product =>
            keywords.every(keyword => product.name.toLowerCase().includes(keyword.toLowerCase()) ||
                product.type.toLowerCase().includes(keyword.toLowerCase()) ||
                product.category.toLowerCase().includes(keyword.toLowerCase())

            )
        );

        res.status(200).json({
            status: 'success',
            message: 'Search successful',
            data: filteredResults
        });
    } catch (error) {
        res.status(404).json({
            status: 'error',
            message: 'Error searching products',
            error: error.message
        });
    }
}
const getTopSellingProducts = async (req, res) => {
    try {
        const topSellingProducts = await Product.find()
            .sort({ selled: -1 }) // Sắp xếp theo số lượng đã bán giảm dần
            .limit(5); // Giới hạn số lượng sản phẩm trả về là 10

        res.status(200).json({ success: true, data: topSellingProducts });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
const checkStock = async (req, res) => {
    try {
        const products = req.body.products; // Danh sách các sản phẩm cần kiểm tra
        const outOfStockProducts = [];
        console.log(products)

        // Duyệt qua từng sản phẩm trong danh sách
        for (const product of products) {
            // Tìm sản phẩm trong cơ sở dữ liệu
            const foundProduct = await Product.findOne({
                _id: product.product, 'sizes': {
                    $elemMatch: {
                        size: product.size,
                        countInStock: { $gte: product.amount }
                    }
                }
            });

            // Kiểm tra xem sản phẩm có tồn kho đủ không
            if (!foundProduct) {
                // Nếu không đủ tồn kho, thêm vào danh sách sản phẩm không đủ
                outOfStockProducts.push(product.name);
            }
        }

        if (outOfStockProducts.length > 0) {
            // Nếu có sản phẩm không đủ tồn kho, trả về thông báo lỗi
            return res.status(200).json({ success: false, message: 'Sản phẩm sau không đủ tồn kho: ' + outOfStockProducts.join(', ') });
        } else {
            // Nếu tất cả các sản phẩm đều có tồn kho đủ, tiếp tục xử lý
            // ở đây bạn có thể thêm mã logic cho việc đặt hàng hoặc xử lý tiếp theo
            return res.status(200).json({ success: true, message: 'Tất cả sản phẩm đều có tồn kho đủ.' });
        }
    } catch (error) {
        console.error('Error:', error);
        return res.status(404).json({ message: 'Đã xảy ra lỗi khi kiểm tra tồn kho sản phẩm.' });
    }
};
module.exports = {
    createProduct,
    updateProduct,
    getDetailsProduct,
    deleteProduct,
    getAllProduct,
    deleteMany,
    getAllType,
    findManyByObj,
    getTypeCategories,
    filterProduct,
    getProductByType,
    getCategories,
    getDetailsProductAdmin,
    searchImage,
    getTotalProducts,
    getProductByCategory,
    searchProducts,
    getTopSellingProducts,
    checkStock

}