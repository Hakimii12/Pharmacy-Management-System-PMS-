import mongoose from "mongoose";
const TransfareSchema = new mongoose.Schema({
   product :{
         type:mongoose.Schema.Types.ObjectId,
         ref:'Product',
         required:true
   },
   user:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'user',
    required:true
   },
   type:{
    type:String,
    enum: ['ISSUE_TO_DISPENSARY', 'RETURN_TO_STORE'],
    required:true
   },
   quantity:{
    type:Number,
    required:true
   },
    date: {
    type: Date,
    default: Date.now
  }
});
const Transfare= mongoose.model('Transfare', TransfareSchema)
export default Transfare;