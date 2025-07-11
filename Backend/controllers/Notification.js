import Notification from "../models/NotificationModel.js";
export async function GetNotification(req,res){
    try {

         const notification = await Notification.find({});
         if (!notification) {
             return res.status(404).json({ message: 'notification not found' });
         }
         res.json(notification);
    } catch (error) {
        res.status(500).json({ message:error.message})
    }
}
export async function DeleteNotification(req,res){
    const id = req.params.id;
    try {
        await Notification.findByIdAndDelete(id);
        res.status(200).json({message: "notification deleted"})
    } catch (error) {
        res.status(500).json({message:error.message})
    }
}
export async function MarkAsRead(req,res){
    const id = req.params.id
    try {
        const notification = await Notification.findByIdAndUpdate( id,{read:true} ,{new:true})
        res.status(200).json(notification)
    } catch (error) {
        res.status(500).json({message:error.message})
    }
}
export async function MarkAsReadAll(req,res){
    try {
        const notification = await Notification.updateMany({read:false},{read:true})
        res.status(200).json(notification)
    } catch (error) {
        res.status(500).json({message:error.message})
    }
}