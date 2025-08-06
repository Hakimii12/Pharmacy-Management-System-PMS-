import mongoose from "mongoose";

const DosageFormSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true 
  },
  createdAt: { type: Date, default: Date.now }
});

const DosageForm = mongoose.model("DosageForm", DosageFormSchema);
export default DosageForm;