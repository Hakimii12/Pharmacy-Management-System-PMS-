const allowedUsers = (...allowedRoles) => {
    return (req, res, next) => {

      if(!req.user){
        return res.status(404).json({ message: "no user found" });
      }

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: "Access Denied" });
      }
      next();
    };
  };
  export default allowedUsers;
  