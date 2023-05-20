
const cartModels = require("../models/cartModels")
const orderModel = require("../models/orderModel")
const userModel = require("../models/userModel")

const createOrder = async function(req,res){
    try {
        let data = req.body
        let userId = req.params.userId
        if(Object.keys(data).length===0) return res.status(400).send({status:false,message:"pls send some data for creating order ,[cartId] cancellable is optional ]"})
        let{cartId, cancellable,...rest} = data
        if(Object.keys(rest).length>0) return res.status(400).send({status:false,message:"pls send valid fields"})
        if(cancellable){

            if(!["true","false"].includes(cancellable)) return res.status(400).send({status:false,message:"enter 'false' , if you want your order not cancellable"})
        }
        let cartCheck = await cartModels.findOne({_id:cartId,userId:userId}).select({__v:0,createdAt:0,updatedAt:0})
        if(!cartCheck) return res.status(404).send({status:false,message:"Cart Not found, check cartId & userId"})

        if(cartCheck.items.length===0) return res.status(400).send({status:false,message:"your cart is empty, you cannot create order"})
         let count = 0
        let totalQuantity = cartCheck.items.filter((x)=>{
            return count += x.quantity  // count = count + x.quantity
        })
     
        let orderData = {
            userId:userId,
            items:cartCheck.items,
            totalQuantity : count,
            totalItems :cartCheck.totalItems,
            totalPrice : cartCheck.totalPrice
        }

        let createOrder = await orderModel.create(orderData)
        await cartModels.findOneAndUpdate({_id:cartId},{$set:{items:[],totalItems:0,totalPrice:0}},{new:true})
        return res.status(200).send({status:true,message:"Success",data:createOrder})

    } catch (error) {
        console.log("error in create order",error.message)
        return res.status(500).send({status:false,message:error.message})
    }
}


const updateOrder = async(req,res)=>{
 try {
    let data = req.body
    let userId = req.params.userId
    let {orderId,status,...rest} = data

    if(Object.keys(data).length===0) return res.status(400).send({status:false,message:"pls send data to update order"})

    if(Object.keys(rest).length>0) return res.status(400).send({status:false,message:"pls send valid fields"})
    
    if(!orderId) return res.status(400).send({status:false,message:"provide orderId for update order"})
    orderId = orderId.trim();
    if(!status) return res.status(400).send({status:false,message:"status is required , provide status for update order, [ completed or cancelled]"})
    let checkOrder = await orderModel.findOne({_id:orderId,userId:userId})
    if(!checkOrder) return res.status(404).send({status:false,message:"Order not found"})
  
    if(status == "pending" ) return res.status(400).send({status:false,message:"order status is default pending, you cannot set maually to 'pending', Use [ completed, cancelled] "})
    if(!["completed", "cancelled"].includes(status)) return res.status(400).send({status:false,message:"send valid status, [ completed, cancelled]"})
    let checkCancel = checkOrder.cancellable
   

    if(checkOrder.status == "cancelled" ) return res.status(400).send({status:false,message:"Given order already cancelled"})
    if(checkOrder.status == "completed" ) return res.status(400).send({status:false,message:"Given order has been completed, You cannot update this order"})
   
    if(checkCancel == true){
        if(checkOrder.status == "pending") {
            checkOrder.status = status
            checkOrder.cancellable = false
        }

    } 
    else if (checkCancel == false && status=="completed"){
        if(checkOrder.status == "pending") {
            checkOrder.status = status
           
        }

    }
    else{
        return res.status(400).send({status:false,message:"You can not update status of this order, because its not cancellable"})

    }

    let updateOrder = await orderModel.findOneAndUpdate({_id:orderId,isDeleted:false},{$set:{status:status,cancellable:false}},{new:true})

    return res.status(200).send({status:true,message:"Success", data:updateOrder})


 } catch (error) {
    console.log("error in update Order",error.message);
    return res.status(500).send({status:false,message:error.message})
 }
}







module.exports={createOrder,updateOrder}