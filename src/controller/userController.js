// const  validator = require("validator");
const  JWT  = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const userModel = require("../models/userModel");
const { uploadFile } = require("./aws");
const { default: mongoose } = require("mongoose");

const {isvalidName, isvalidEmail, isvalidpassword, isValidTitle} =require("./validator")
let validateMobile = /^[6-9][0-9]{9}$/;

const createUser = async(req,res)=>{
    try {
    let data = req.body
    if (Object.keys(data).length === 0) return res.status(400).send({ message: "plz provide user's data" });
       
    let {fname,lname,email,phone,password,address,...rest} = data
    
    if (Object.keys(rest).length > 0) return res.status(400).send({ message: "Invalid field data" });
///------------------------- Validation------------------------------------------


if (!fname) return res.status(400).send({ status: false, message: "first name is mandatory" });
if (!isvalidName(fname)) return res.status(400).send({ status: false, message: "plz enter valid first name,  includes only alphabates" });


if (!lname) return res.status(400).send({ status: false, message: "last name is mandatory" });
if (!isvalidName(lname)) return res.status(400).send({ status: false, message: "plz enter valid last name,  includes only alphabates" });


if (!email)return res.status(400).send({ status: false, message: "email is mandatory" });
if (!isvalidEmail(email))return res.status(400).send({ status: false, message: "plz enter valid email" });
let checkEmailExist = await userModel.findOne({email:email})
if(checkEmailExist) return res.status(400).send({status:false,message:"This email already exist"})//409 duplicate


if (!phone) return res.status(400).send({ status: false, message: "phone is mandatory" });
if (!validateMobile.test(phone.trim())) return res.status(400).send({ status: false, message: "plz enter valid Indian mobile number" });
let checkPhoneExist = await userModel.findOne({phone})
if(checkPhoneExist) return res.status(400).send({status:false,message:"This phone no. already exist"})

if (!password) return res.status(400).send({ status: false, message: "password is mandatory" });
// password = password.trim()
if(!(/^(?=.[a-z0-9])[a-zA-Z0-9!@#$%^&]{8,15}$/).test(password.trim())) return res.status(400).send({
 status: false,  mesage: "password length must be  8 to  15 char",
       });

  
if(!address || (Object.keys(address).length===0)) return res.status(400).send({status:false,message:"Address is required"})
let newAddress = JSON.parse(address)
let {shipping,billing,...newRest} = newAddress


if (Object.keys(newRest).length > 0) return res.status(400).send({status:false, message: "Invalid field in address data" });
if(!shipping || (Object.keys(shipping).length===0)) return res.status(400).send({status:false,message:"Shipping address is required"})
{
    let {street,city,pincode,...other} = shipping
    if (Object.keys(other).length > 0) return res.status(400).send({ status:false,message: "Invalid field in 'shipping', Use only [street,city,pincode]" });
    if(!street) return res.status(400).send({status:false,message:"street is mandatory in shipping address"})
    if(!/^/.test(street.split(" ").join(""))) return res.status(400).send({status:false,message:"Invalid street name in shipping"})
    if(!city) return res.status(400).send({status:false,message:"city is mandatory in shipping address"})
    if(!isValidTitle(shipping.city)) return res.status(400).send({status:false,message:"Invalid city name in shipping"})
    if(!pincode) return res.status(400).send({status:false,message:"pincode is mandatory in shipping address"})
    if (!/^[^0][0-9]{2}[0-9]{3}$/.test(shipping.pincode))  return res.status(400).send({status: false,message: "Pincode should be a valid pincode number in shipping."});

}

if(!billing || (Object.keys(billing).length===0)) return res.status(400).send({status:false,message:"Billing address is required"})
{
    let {street,city,pincode,...other} = billing
    if (Object.keys(other).length > 0) return res.status(400).send({ status:false,message: "Invalid field in 'billing', Use only [street,city,pincode]" });
    if(!street) return res.status(400).send({status:false,message:"street is mandatory in billing address"})
    if(!city) return res.status(400).send({status:false,message:"city is mandatory in billing address"})
    if(!pincode) return res.status(400).send({status:false,message:"pincode is mandatory in billing address"})
    if(!/^/.test(street)) return res.status(400).send({status:false,message:"Invalid street address in billing"})
    if(!isValidTitle(billing.city)) return res.status(400).send({status:false,message:"Invalid city name in billing"})
    if (!/^[^0][0-9]{2}[0-9]{3}$/.test(billing.pincode))  return res.status(400).send({status: false,message: "Pincode should be a valid pincode number in billing."});
}

    let imageUrl = req.files

    if(imageUrl.length===0) return res.status(400).send({status:false,message:"profileImage is mandatory"})
    
    let urlType = imageUrl[0].originalname;
    if(!/\.(gif|jpe?g|tiff?|png|webp|bmp)$/i.test(urlType)) return res.status(400).send({status:false,message:"Plz provide valid image file"})
    
    let uploadedFileURL;  

    if (imageUrl.length > 0) {
        if(imageUrl[0].fieldname != "profileImage"){
            return res.status(400).send({status:false,message:"invalid image key, use [ profileImage ] as key"})
        }
      uploadedFileURL = await uploadFile(imageUrl[0]);
    } 

    if(!uploadedFileURL) return res.status(404).send({ msg: "No file found" });
   

    let bcryptPass = await bcrypt.hash(password, 10)
 
    let userData = {fname,lname,email,phone,password:bcryptPass,address:newAddress,profileImage:uploadedFileURL}

    let createUser = await userModel.create(userData)

    res.status(201).send({status:true,message:"User created successfully", data:createUser})

    } catch (error) {
        console.log("error in createUser", error.message);

        res.status(500).send({status:false,message:error.message})
    }

}




const loginUser = async (req,res)=>{
   try {
    let data = req.body

    if (Object.keys(data).length === 0) return res.status(400).send({ message: "plz provide user's data" });
    let {email,password,...rest} = data
    if (Object.keys(rest).length >0) return res.status(400).send({ message: "plz provide valid data [email & password only]" });
        
    if (!email)return res.status(400).send({ status: false, message: "email is mandatory" });
    if (!isvalidEmail(email))return res.status(400).send({ status: false, message: "plz enter valid email" });

    let findUser = await userModel.findOne({email:email})
    if(!findUser) return res.status(404).send({status:false, message:"User not found"})

    if (!password) return res.status(400).send({ status: false, message: "password is mandatory" });
    // password= password.trim()
    if(!(/^(?=.[a-z0-9])[a-zA-Z0-9!@#$%^&]{8,15}$/).test(password.trim())) return res.status(400).send({
     status: false,  message: "password length must be  8 to  15 char",
           });
   
     
     let userPassword = findUser.password
     let originalPassword = await bcrypt.compare(password, userPassword)
     if(!originalPassword) return res.status(401).send({status:false, message:"Incorrect password, plz provide valid password"})


     let userId = findUser._id
     let token = JWT.sign({ userId: userId }, "group2project-5", {expiresIn: 8600});
  

    return res.status(200).send({status:true,message:"User login successfull", data:{userId:userId, token:token}})

   } catch (error) {
    console.log("error in loginUser", error.message)
    return res.status(500).send({status:false,message:error.mesage})

   }
}




const getUser = async (req, res) => {
    try {
      let userId = req.params.userId;

      if (!mongoose.isValidObjectId(userId)) return res.status(400).send({ status: false, message: "userId is not vaild" });
      
    //   if (userId != req.tokenDetails.userId) return res.status(401).send({ status: false, message: "This userId is not authenticate" });
      
      let getUser = await userModel.findOne({ _id: userId });

      if(!getUser) return res.status(404).send({status:false,message:"User not available, server may be down"})
     
      return res.status(200).send({ status: true, message: "User profile details", data: getUser });

    } catch (err) {

      return res.status(500).send({ status: false, message: err.message });

    }
  };


const updateUser = async(req,res)=>{
    try {
        let data = req.body
       let userId = req.params.userId

    //    if(!mongoose.isValidObjectId(userId))
    if (Object.keys(data).length === 0) return res.status(400).send({ message: "plz provide user's data" });
    
    let {fname,lname,email,phone,password,address,...rest} = data

    if (Object.keys(rest).length > 0) return res.status(400).send({ status: false,message:"pls use valid fields like[fname,lname,email,phone,password,address, profilImage] to update user details"})


///------------------------- Validation------------------------------------------



if (fname) {

    if (!isvalidName(fname) ) return res.status(400).send({ status: false, message: "plz enter valid first name,  includes only alphabates" });
}

if (lname){

    if (!isvalidName(lname)) return res.status(400).send({ status: false, message: "plz enter valid last name,  includes only alphabates" });
}


if (email){

    if (!isvalidEmail(email))return res.status(400).send({ status: false, message: "plz enter valid email" });
    let checkEmailExist = await userModel.findOne({email:email})
    if(checkEmailExist) return res.status(400).send({status:false,message:"This email already exist, enter another email"})
}

if (phone){

    if (!validateMobile.test(phone.trim())) return res.status(400).send({ status: false, message: "plz enter valid Indian mobile number" });
    let checkPhoneExist = await userModel.findOne({phone:phone})
    if(checkPhoneExist) return res.status(400).send({status:false,message:"This phone no. already exist, enter new number"})
}

if (password) {

    if(!isvalidpassword(password))return res.status(400).send({
        status: false,  mesage: "password must be greater than 8 char and less than 15 char",
              });
        var bcryptPass = await bcrypt.hash(password, 10)
}


let getUserData = await userModel.findOne({_id:userId}).select({address:1})

let userNewAddress = getUserData.address


if((Object.keys(data).includes("address"))) {

    
    if((address.length===0)) return res.status(400).send({status:false,message:"Address is required, if you want to update"})
    
    
    // if(address){
        
        var newAddress = JSON.parse(address)
     
   
    if((Object.keys(newAddress).length===0)) return res.status(400).send({status:false,message:"Address is required"})
      let {shipping,billing,...rest} = newAddress
      if (Object.keys(rest).length > 0) return res.status(400).send({ status: false,message:"pls use valid fields[shipping,billing]in address"})

    



    if(shipping){
        if( (Object.keys(shipping).length===0)) return res.status(400).send({status:false,message:"Shipping address is required"})

        let {street,city,pincode,...rest} = shipping
        if (Object.keys(rest).length > 0) return res.status(400).send({ status: false,message:"pls use valid fields[street,city,pincode] in shipping"})
   


        if(shipping.street){

            if(!/^/.test(shipping.street)) return res.status(400).send({status:false,message:"Invalid street in shipping"})
            userNewAddress.shipping.street= shipping.street
        }
        if(shipping.city){

            if(!isValidTitle(shipping.city)) return res.status(400).send({status:false,message:"Invalid city name in shipping"})
            userNewAddress.shipping.city= shipping.city
        }
        if(shipping.pincode){

            if (!/^[^0][0-9]{2}[0-9]{3}$/.test(shipping.pincode))  return res.status(400).send({status: false,message: "Pincode should be a valid pincode number. in shipping"});
            userNewAddress.shipping.pincode= shipping.pincode
        }
        
    }

  

    if(billing){
        if( (Object.keys(billing).length===0)) return res.status(400).send({status:false,message:"Billing address is required"})
        let {street,city,pincode,...rest} = billing
        if (Object.keys(rest).length > 0) return res.status(400).send({ status: false,message:"pls use valid fields[street,city,pincode] in billing"})
   

        if(billing.street){

            if(!/^/.test(billing.street)) return res.status(400).send({status:false,message:"Invalid street in billing"})
            userNewAddress.billing.street= billing.street
        }
        if(billing.city){

            if(!isValidTitle(billing.city)) return res.status(400).send({status:false,message:"Invalid city name in billing"})
            userNewAddress.billing.city= billing.city
        }
        if(billing.pincode){

            if (!/^[^0][0-9]{2}[0-9]{3}$/.test(billing.pincode))  return res.status(400).send({status: false,message: "Pincode should be a valid pincode number. in billing"});
            userNewAddress.billing.pincode= billing.pincode
        }
        
    }

}

//   }



let imageUrl = req.files

if (imageUrl.length > 0) {
    let urlType = imageUrl[0].originalname;
    if(!/\.(gif|jpe?g|tiff?|png|webp|bmp)$/i.test(urlType)) return res.status(400).send({status:false,message:"Plz provide valid image file"})
    if(imageUrl[0].fieldname != "profileImage"){
        return res.status(400).send({status:false,message:"invalid image key, use [ profileImage ] as key"})
    }
  var  uploadedFileURL = await uploadFile(imageUrl[0]);
  if(!uploadedFileURL) return res.status(404).send({ msg: "No file found" });
} 

    
   

//--------------------------------Duplicate email, phone --------------------------------------------

   
 
 
    let userUpdateData = {fname,lname,email,phone,password:bcryptPass,address:userNewAddress,profileImage:uploadedFileURL}
    
   
    let updateUser = await userModel.findOneAndUpdate({_id:userId},userUpdateData,{new:true})
  

    return res.status(200).send({status:true, message:"User profile updated",data:updateUser})

    } catch (error) {
        console.log("error in updateUser",error.message)
        return res.status(500).send({status:false,message:error.message})
    }
}



module.exports = {createUser,loginUser,getUser,updateUser}