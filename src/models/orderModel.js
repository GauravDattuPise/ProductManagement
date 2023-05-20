const mongoose = require("mongoose")
const objectId = mongoose.Schema.Types.ObjectId

const orderSchema = new mongoose.Schema({
    userId: {type:objectId, ref:"User", required:true,trim:true},
    items: [{
      productId: {type:objectId, ref:"Product" , required : true,trim:true},
      quantity: {type: Number, required : true,default:1,trim:true}//min 1
    }],
    totalPrice: {type:Number, required : true,trim:true},//comment: "Holds total price of all the items in the cart"
    totalItems: {type:Number, required : true,trim:true},//comment: "Holds total number of items in the cart"
    totalQuantity: {type:Number, required : true,trim:true},//comment: "Holds total number of quantity in the cart
    cancellable: {type:Boolean, default: true},
    status: {type:String, default: 'pending', enum:["pending", "completed", "cancelled"],trim:true},
    deletedAt: {type:Date,trim:true},//when the document is deleted 
    isDeleted: {type:Boolean, default: false,trim:true}
   
},{timestamps:true})


module.exports = mongoose.model('Order',orderSchema)
