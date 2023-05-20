const { default: mongoose } = require("mongoose")
const cartModels = require("../models/cartModels")
const productModel = require("../models/productModel")
const userModel = require("../models/userModel")


const createCart = async(req,res)=>{
    try {
        let data = req.body
    let userId = req.params.userId

    if(Object.keys(data).length===0) return res.status(400).send({status:false,message:"Send data to create cart"})
    if(!mongoose.isValidObjectId(userId)) return res.status(400).send({status:false,message:"Inavlid userId"})


    let checkUser = await userModel.findOne({_id:userId})
    if(!checkUser) return res.status(404).send({status:false,message:"no user found"})


    let {productId,cartId,...rest} = data
    
    
    if(!productId) return res.status(400).send({status:false,message:"productId is mandatory"})
    productId = productId.trim()

    if(!mongoose.isValidObjectId(productId)) return res.status(400).send({status:false,message:"Inavlid productId"})
    let checkProduct = await productModel.findOne({_id:productId,isDeleted:false})
    if(!checkProduct) return res.status(404).send({status:false,message:"no product found"})



    if(Object.keys(rest).length>0) return res.status(400).send({status:false,message:"Invalid data, plz send cartId and ProductID"})


    items = [{productId:productId,quantity:1}]

    let price = checkProduct.price


    // checking if user has cart or not

    let checkuserHasCart = await cartModels.findOne({userId:userId})

    // if(checkuserHasCart._id===null)


    let cartData = {
        userId,items,totalItems:1,totalPrice:0
    }


    /// if user has no cart, then create cart /// [ checking by userId in cart collection]

    if(!checkuserHasCart) {

        cartData.totalPrice = price
        let createCart = await cartModels.create(cartData)
        return res.status(201).send({status:true,message:"Success cart",data:createCart})
    }

    // if user has cart then push product id to items

    if(checkuserHasCart) {
            if(!cartId) return res.status(400).send({status:false,message:" your cart has been created, enter your cartId"})

            cartId = cartId.trim()
            let checkCart = await cartModels.findOne({_id:cartId})
            if(!checkCart) return res.status(404).send({status:false,message:"This cart not found"})
            if(checkuserHasCart._id!=cartId) return res.status(400).send({status:false,message:"This cartId does not belong to given userId"})


            /// CHECKING THE CART HAS SAME PRODUCT, IF IT DOES INCREASING ITS QUANTITY AND TOTAL PRICE


            let checkProductDuplicate = await cartModels.findOne({"items.productId": productId, userId:userId })

            if (checkProductDuplicate){
                let productAvailable = await cartModels.findOneAndUpdate({"items.productId": productId },{$inc:{'items.$.quantity':1,totalPrice:cartData.totalPrice+price}},{new:true}).select({__v:0,'items._id':0})

                return res.status(201).send({status:true,message:"Success",data:productAvailable})
            }

            // IF PRODUCT IS NEW, THEN IT WILL ADDED TO ITEMS ARRAY AND INCREASING TOTAL ITEMS, ALSO INCREASING ITEMS

            if(!checkProductDuplicate){
                let arr = checkuserHasCart.items.concat(items)

                cartId = checkuserHasCart._id.toString()
                cartData.items=arr
                cartData.totalItems = arr.length
                cartData.totalPrice = checkuserHasCart.totalPrice+ price
                cartId = cartId.trim()
                let productAvailable = await cartModels.findOneAndUpdate({_id:cartId},cartData,{new:true})

                return res.status(201).send({status:true,message:"Success",data:productAvailable})
            }

    }
    } catch (error) {
        console.log("error in createCart", error.message)
        res.status(500).send({status:false,message:error.message})
    }

}




const updateCart = async function (req, res) {

    try {
        let cartData = req.body
        let { cartId, productId, removeProduct,...rest } = cartData
        if(Object.keys(rest).length>0) return res.status(400).send({status:false,message:"Invalid data, plz send cartId and ProductID"})
        // let userId = req.params.userId

        // validation
        if (Object.keys(cartData).length === 0)
        return res.status(400).send({ status: false, message: "Provide some data update cart" })

        if (!productId)
            return res.status(400).send({ status: false, message: "Product id is mandatory" })
        productId = productId.trim()
        
        if (!mongoose.isValidObjectId(productId))
            return res.status(400).send({ status: false, message: "Product id is invalid" })

        let findProduct = await productModel.findOne({ _id: productId, isDeleted: false })
        if (!findProduct)
            return res.status(404).send({ status: false, message: "Product not found" })


        if (!cartId) return res.status(400).send({ status: false, message: "cartId id is mandatory" })
        cartId = cartId.trim()
   if (!mongoose.isValidObjectId(cartId)) return res.status(400).send({ status: false, message: "cartId id is invalid" })

     let findCart = await cartModels.findOne({ _id: cartId})
   
  

     if(!findCart) return res.status(404).send({ status: false, message: "cart not found" })

     let findProductInCart = findCart.items.filter((x)=>{
       return x.productId.toString() == productId

     })

     if(!removeProduct) return res.status(400).send({ status: false, message: "removeProduct id is mandatory" })
     if(findProductInCart.length===0) return res.status(404).send({ status: false, message: "product is not available in this cart or deleted" })



     if((removeProduct <  0) || (removeProduct > 1)) return res.status(400).send({ status: false, message: "Invalid removeProduct value, must be '1' or '0' " })

        if (removeProduct == 1) {

            let totalPrice = findCart.totalPrice - findProduct.price
            let productAvailable = await cartModels.findOneAndUpdate({ "items.productId": productId }, { $inc: { 'items.$.quantity': -1 },$set:{totalPrice:totalPrice} }, { new: true })




            for (let i = 0; i < productAvailable.items.length; i++) {

                if (productAvailable.items[i].quantity === 0) {
                    let arr = productAvailable.items.filter((x) => {
                        return x.quantity > 0
                    })
                    productAvailable.items = arr
                    productAvailable.totalItems = arr.length
                    let quantity ;
                    if(findCart.items[i].productId.toString() == productId){
                        quantity = findCart.items[i].quantity
                    }
                    productAvailable.totalPrice = findCart.totalPrice - (findProduct.price * quantity)

                    let updateCart = await cartModels.findOneAndUpdate({ _id: cartId }, productAvailable, { new: true })

                    return res.status(200).send({status:true,message:"Success", data: updateCart })
                }

            }


            return res.status(200).send({ status:true,message:"Success", data: productAvailable })
        }

        if (removeProduct == 0) {

            let productAvailable = await cartModels.findOne({ "items.productId": productId })

            for (let i = 0; i < productAvailable.items.length; i++) {

                if (productAvailable.items[i].productId.toString() === productId) {
                    let arr = productAvailable.items.filter((x) => {
                        return x.productId != productId
                    })
                    productAvailable.items = arr
                    productAvailable.totalItems = arr.length
                    let quantity ;
                    if(findCart.items[i].productId.toString() == productId){
                        quantity = findCart.items[i].quantity
                    }
                    productAvailable.totalPrice = findCart.totalPrice - (findProduct.price * quantity)
                    let updateCart = await cartModels.findOneAndUpdate({ _id: cartId }, productAvailable, { new: true })
                    return res.status(200).send({status:true,message:"Success", data: updateCart })
                }

            }
        }



    }
    catch (error) {
        res.status(500).send({ status: false, message: error.message })
    }
}



const getCart = async function (req, res) {
    try {
     let userId = req.params.userId
    //  if (!mongoose.isValidObjectId(userId)) return res.status(400).send({ status: false, message: "pls provide valid userID" })

    //  let userCheck = await userModel.findOne({ _id: userId })
    //  if (!userCheck) return res.status(404).send({ status: false, message: "user not exist with this userID" })

     let cartCheck = await cartModels.findOne({ userId: userId }).populate("items.productId",{__v:0,createdAt:0,updatedAt:0})//.select({"items[_id]":0,"items.productId[__v]":0})
     if (!cartCheck) return res.status(404).send({ status: false, message: "No cart crated yet for this user" })
       
    return res.status(200).send({ status: true, message: "Success", data: cartCheck })

    } catch (error) {
     return res.status(500).send({status:false,message:error.message})
    }
 }

 const deleteCart = async function(req,res){
    try {

       let userId = req.params.userId

       let showDetails = await cartModels.findOneAndUpdate({userId:userId},{$set:{items:[],totalItems:0,totalPrice:0}},{new:true})

       if(!showDetails) return res.status(404).send({ status: false, message: "cart not exist this userId" })

       return res.status(204).send({status:true,message:"Success",data:showDetails})


    } catch (error) {
        return res.status(500).send({status:false,message:error.message})
    }
}



module.exports = {createCart,updateCart,getCart,deleteCart}